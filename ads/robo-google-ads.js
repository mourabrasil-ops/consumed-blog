/**
 * Robô do Google Ads – Consumed Clínica de Olhos
 * Roda dentro do Google Ads (Ferramentas > Ações em massa > Scripts), de hora em hora.
 * 1) Escreve um relatório numa planilha "Consumed Ads – Robô" (ontem, 7 e 30 dias + termos de pesquisa).
 * 2) Aplica comandos aprovados em ads/comandos.json do GitHub (cada comando só uma vez).
 * Comandos aceitos (com limites de segurança):
 *   {"id":"...","tipo":"orcamento","campanha":"Nome exato","valor":150}      -> orçamento diário em R$ (máx. LIMITE_ORCAMENTO)
 *   {"id":"...","tipo":"pausar","campanha":"Nome exato"}
 *   {"id":"...","tipo":"ativar","campanha":"Nome exato"}
 *   {"id":"...","tipo":"negativa","campanha":"Nome exato ou todas","palavra":"sulamerica","correspondencia":"frase|exata|ampla"}
 */
var URL_COMANDOS = 'https://raw.githubusercontent.com/mourabrasil-ops/consumed-blog/main/ads/comandos.json';
var NOME_PLANILHA = 'Consumed Ads – Robô';
var LIMITE_ORCAMENTO = 2000; // R$ por dia, por campanha

function main() {
  var ss = planilha_();
  relatorio_(ss);
  comandos_(ss);
}

function planilha_() {
  var it = DriveApp.getFilesByName(NOME_PLANILHA);
  var ss = it.hasNext() ? SpreadsheetApp.open(it.next()) : SpreadsheetApp.create(NOME_PLANILHA);
  ['Campanhas', 'Termos', 'Comandos'].forEach(function (n) { if (!ss.getSheetByName(n)) ss.insertSheet(n); });
  var f = DriveApp.getFileById(ss.getId());
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  Logger.log('Planilha: ' + ss.getUrl());
  return ss;
}

function linhas_(q, cols) {
  var out = [];
  var rows = AdsApp.report(q).rows();
  while (rows.hasNext()) {
    var r = rows.next();
    out.push(cols.map(function (c) {
      var v = r[c];
      if (c.indexOf('cost_micros') > -1) return Math.round(Number(v) / 10000) / 100;
      return v;
    }));
  }
  return out;
}

function relatorio_(ss) {
  var sh = ss.getSheetByName('Campanhas');
  sh.clear();
  var tz = AdsApp.currentAccount().getTimeZone();
  sh.appendRow(['Atualizado em', Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy HH:mm')]);
  var cols = ['campaign.name', 'campaign.status', 'campaign_budget.amount_micros', 'metrics.cost_micros', 'metrics.clicks', 'metrics.impressions', 'metrics.conversions'];
  ['YESTERDAY', 'LAST_7_DAYS', 'LAST_30_DAYS'].forEach(function (p) {
    sh.appendRow(['Período: ' + p]);
    sh.appendRow(['Campanha', 'Status', 'Orçamento/dia R$', 'Custo R$', 'Cliques', 'Impressões', 'Conversões', 'Custo/conv R$']);
    var q = 'SELECT ' + cols.join(', ') + ' FROM campaign WHERE segments.date DURING ' + p + " AND campaign.status != 'REMOVED' ORDER BY metrics.cost_micros DESC";
    linhas_(q, cols).forEach(function (l) {
      l[2] = Math.round(Number(l[2]) / 10000) / 100;
      l.push(l[6] > 0 ? Math.round(l[3] / l[6] * 100) / 100 : '');
      sh.appendRow(l);
    });
  });
  var st = ss.getSheetByName('Termos');
  st.clear();
  st.appendRow(['Termo pesquisado (7 dias)', 'Campanha', 'Cliques', 'Custo R$', 'Conversões']);
  var tc = ['search_term_view.search_term', 'campaign.name', 'metrics.clicks', 'metrics.cost_micros', 'metrics.conversions'];
  var tq = 'SELECT ' + tc.join(', ') + ' FROM search_term_view WHERE segments.date DURING LAST_7_DAYS ORDER BY metrics.cost_micros DESC LIMIT 150';
  var tl = linhas_(tq, tc);
  if (tl.length) st.getRange(2, 1, tl.length, tc.length).setValues(tl);
}

function campanhas_(nome) {
  var res = [];
  var it = (nome === 'todas') ? AdsApp.campaigns().withCondition("campaign.status != 'REMOVED'").get()
                              : AdsApp.campaigns().withCondition('campaign.name = "' + String(nome).replace(/"/g, '') + '"').get();
  while (it.hasNext()) res.push(it.next());
  return res;
}

function comandos_(ss) {
  var sh = ss.getSheetByName('Comandos');
  if (sh.getLastRow() === 0) sh.appendRow(['id', 'tipo', 'resultado', 'quando']);
  var feitos = {};
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().forEach(function (r) { feitos[r[0]] = 1; });
  var resp;
  try { resp = UrlFetchApp.fetch(URL_COMANDOS + '?t=' + Date.now(), { muteHttpExceptions: true }); } catch (e) { Logger.log(e); return; }
  if (resp.getResponseCode() !== 200) return;
  var lista = (JSON.parse(resp.getContentText()).comandos) || [];
  lista.forEach(function (c) {
    if (!c.id || feitos[c.id]) return;
    var r = '';
    try {
      var camps = campanhas_(c.campanha || '');
      if (!camps.length) r = 'campanha não encontrada';
      else if (c.tipo === 'orcamento') {
        var v = Number(c.valor);
        if (!(v > 0) || v > LIMITE_ORCAMENTO) r = 'valor fora do limite';
        else { camps.forEach(function (k) { k.getBudget().setAmount(v); }); r = 'orçamento R$ ' + v + ' em ' + camps.length + ' campanha(s)'; }
      } else if (c.tipo === 'pausar') { camps.forEach(function (k) { k.pause(); }); r = 'pausada(s): ' + camps.length; }
      else if (c.tipo === 'ativar') { camps.forEach(function (k) { k.enable(); }); r = 'ativada(s): ' + camps.length; }
      else if (c.tipo === 'negativa' && c.palavra) {
        var p = String(c.palavra).replace(/["\[\]]/g, '');
        var kw = c.correspondencia === 'exata' ? '[' + p + ']' : (c.correspondencia === 'ampla' ? p : '"' + p + '"');
        camps.forEach(function (k) { k.createNegativeKeyword(kw); });
        r = 'negativa ' + kw + ' em ' + camps.length + ' campanha(s)';
      } else r = 'comando inválido';
    } catch (e) { r = 'erro: ' + e; }
    sh.appendRow([c.id, c.tipo, r, new Date()]);
  });
}
