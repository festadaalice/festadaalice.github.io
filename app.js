(function () {
  'use strict';

  var F = window.FESTA;
  var FUSO = 'America/Sao_Paulo';
  var VAI = 'vai';
  var NAO_VAI = 'não vai';

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Datas (sempre no fuso de São Paulo) ---------- */

  function diaEmSP(data) {
    // 'AAAA-MM-DD' do dia em São Paulo, qualquer que seja o fuso do celular
    return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(data);
  }
  function diasEntre(diaA, diaB) {
    var a = diaA.split('-').map(Number), b = diaB.split('-').map(Number);
    return Math.round((Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / 86400000);
  }
  function formatar(data, opcoes) {
    return new Intl.DateTimeFormat('pt-BR', Object.assign({ timeZone: FUSO }, opcoes)).format(data);
  }
  var inicio = new Date(F.inicio);
  var fim = new Date(F.fim);
  var prazoMeioDia = new Date(F.prazoConfirmacao + 'T12:00:00-03:00');

  function preencherDatas() {
    var hoje = diaEmSP(new Date());
    var faltam = diasEntre(hoje, diaEmSP(inicio));
    var el = $('faltam');
    if (faltam > 1) el.innerHTML = 'Faltam <strong>' + faltam + ' dias</strong> para a festa.';
    else if (faltam === 1) el.innerHTML = 'Falta <strong>1 dia</strong> para a festa!';
    else if (faltam === 0) el.innerHTML = '<strong>É hoje!</strong>';
    else el.hidden = true;

    var prazoTexto = formatar(prazoMeioDia, { weekday: 'long', day: 'numeric', month: 'long' });
    var prazoPassou = diasEntre(hoje, F.prazoConfirmacao) < 0;
    $('prazo').innerHTML = prazoPassou
      ? 'O prazo para confirmar já passou, mas ainda dá para responder.'
      : 'Confirme sua presença até <strong>' + prazoTexto + '</strong>.';

    var dia = formatar(inicio, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    var hora = formatar(inicio, { hour: '2-digit', minute: '2-digit' });
    $('quando').textContent = dia.charAt(0).toUpperCase() + dia.slice(1) + ', às ' + hora;
    $('onde').textContent = F.endereco;
  }

  /* ---------- Agenda e mapas ---------- */

  function utcCompacto(d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }

  function preencherLinks() {
    var q = encodeURIComponent(F.enderecoMapa);
    var linkMaps = 'https://www.google.com/maps/search/?api=1&query=' + q;
    var linkWaze = 'https://waze.com/ul?q=' + q + '&navigate=yes';
    $('maps').href = $('pronto-maps').href = linkMaps;
    $('waze').href = $('pronto-waze').href = linkWaze;
    $('pronto-endereco').textContent = F.endereco;

    if (F.mapaNaPagina) {
      var quadro = document.createElement('iframe');
      quadro.src = 'https://maps.google.com/maps?q=' + q + '&z=16&output=embed';
      quadro.title = 'Mapa do local da festa';
      quadro.loading = 'lazy';
      quadro.referrerPolicy = 'no-referrer-when-downgrade';
      $('mapa').appendChild(quadro);
      $('mapa').hidden = false;
    }

    var detalhes = 'Confirme sua presença em ' + location.href.split('#')[0];
    var ehApple = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    [$('agenda'), $('pronto-agenda')].forEach(function (agenda) {
      if (ehApple) {
        // arquivo publicado junto do site; o Safari abre direto o "Adicionar ao Calendário"
        agenda.href = 'festa-alice.ics';
        agenda.removeAttribute('target');
      } else {
        agenda.href = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
          '&text=' + encodeURIComponent(F.titulo) +
          '&dates=' + utcCompacto(inicio) + '/' + utcCompacto(fim) +
          '&location=' + q +
          '&details=' + encodeURIComponent(detalhes) +
          '&ctz=' + encodeURIComponent(FUSO);
      }
    });
  }

  /* ---------- Conversa com a planilha ---------- */

  var simulado = null;
  function carregarSimulado() {
    if (simulado) return simulado;
    simulado = new Promise(function (ok, falha) {
      function pronto(fonte) {
        var r = window.PlanilhaFalsa.carregar(fonte);
        r.gs.configurar();
        ok(r.gs);
      }
      function comFonte() {
        if (window.CODIGO_GS) return pronto(window.CODIGO_GS);
        fetch('apps-script/Codigo.gs').then(function (r) { return r.text(); }).then(pronto, falha);
      }
      if (window.PlanilhaFalsa) return comFonte();
      var s = document.createElement('script');
      s.src = 'teste/planilha-falsa.js';
      s.onload = comFonte;
      s.onerror = falha;
      document.head.appendChild(s);
    });
    return simulado;
  }

  function esperar(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }

  function chamar(metodo, dados) {
    if (F.api === 'simulado') {
      return carregarSimulado().then(function (gs) {
        return esperar(600).then(function () {
          var saida = metodo === 'GET'
            ? gs.doGet({ parameter: dados })
            : gs.doPost({ postData: { contents: JSON.stringify(dados) } });
          return JSON.parse(saida.getContent());
        });
      });
    }
    try {
      var controle = typeof AbortController === 'function' ? new AbortController() : null;
      var opcoes = controle ? { signal: controle.signal } : {};
      var relogio = setTimeout(function () { if (controle) controle.abort(); }, 25000);
      var url = metodo === 'GET' ? F.api + '?acao=' + encodeURIComponent(dados.acao) + '&nome=' + encodeURIComponent(dados.nome) : F.api;
      if (metodo === 'POST') {
        // corpo em texto simples: o Apps Script aceita sem a checagem extra (preflight) do navegador
        opcoes.method = 'POST';
        opcoes.body = JSON.stringify(dados);
      }
      return fetch(url, opcoes).then(function (r) {
        clearTimeout(relogio);
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      }, function (e) { clearTimeout(relogio); throw e; });
    } catch (e) {
      return Promise.reject(e);
    }
  }

  var falhasSeguidas = 0;
  function msgFalha() {
    falhasSeguidas++;
    var msg = 'Não conseguimos falar com a lista agora. Confira se a internet está ligada e toque no botão de novo.';
    if (falhasSeguidas >= 2) msg += ' Se continuar sem funcionar, mande sua resposta por mensagem para ' + F.contato + '.';
    return msg;
  }

  /* ---------- Resposta guardada no celular ---------- */

  var CHAVE = 'festa-alice-resposta-v1';
  function lerSalvo() {
    try {
      var s = JSON.parse(localStorage.getItem(CHAVE) || 'null');
      return s && s.grupo && Array.isArray(s.respostas) ? s : null;
    } catch (e) { return null; }
  }
  function salvar(dados) {
    try { localStorage.setItem(CHAVE, JSON.stringify(dados)); } catch (e) { /* sem armazenamento: só não lembra */ }
  }

  /* ---------- Pedacinhos ---------- */

  // Igual ao normalizar_ da planilha: sem acento, minúsculo, sem pontuação
  function normalizar(t) {
    t = String(t == null ? '' : t);
    if (t.normalize) t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return t.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function acharGrupo(grupos, nomeGrupo) {
    var chave = normalizar(nomeGrupo);
    return grupos.filter(function (g) { return normalizar(g.grupo) === chave; })[0] || null;
  }

  function erro(id, texto) {
    var el = $(id);
    el.textContent = texto || '';
    el.hidden = !texto;
  }

  function ocupado(botao, sim, textoOcupado) {
    if (sim) {
      botao.dataset.texto = botao.textContent;
      botao.textContent = textoOcupado;
      botao.disabled = true;
    } else {
      if (botao.dataset.texto) botao.textContent = botao.dataset.texto;
      botao.disabled = false;
    }
  }

  function juntarNomes(nomes) {
    if (nomes.length <= 1) return nomes.join('');
    return nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1];
  }

  var ICONE_VAI = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 12.5l4 4 9-9.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICONE_NAO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>';

  function preencherLista(ul, respostas) {
    ul.innerHTML = '';
    respostas.forEach(function (r) {
      var vai = r.resposta === VAI;
      var li = document.createElement('li');
      var marca = document.createElement('span');
      marca.className = 'marca ' + (vai ? 'vai' : 'nao');
      marca.innerHTML = vai ? ICONE_VAI : ICONE_NAO;
      var texto = document.createElement('span');
      var b = document.createElement('strong');
      b.textContent = r.nome;
      texto.appendChild(b);
      texto.appendChild(document.createTextNode(vai ? ' vai' : ' não vai'));
      li.appendChild(marca);
      li.appendChild(texto);
      ul.appendChild(li);
    });
  }

  /* ---------- Tela principal ---------- */

  function atualizarStatus() {
    var salvo = lerSalvo();
    $('status-aberto').hidden = !!salvo;
    $('status-respondido').hidden = !salvo;
    var barraBotao = $('barra-botao');
    if (salvo) {
      $('respondido-grupo').textContent = salvo.grupo;
      preencherLista($('respondido-lista'), salvo.respostas);
      $('respondido-data').textContent = salvo.em
        ? 'Enviada deste celular em ' + formatar(new Date(salvo.em), { day: 'numeric', month: 'long' }) + '.'
        : '';
      barraBotao.textContent = 'Editar resposta';
      barraBotao.dataset.acao = 'editar';
    } else {
      barraBotao.textContent = 'Confirmar presença';
      barraBotao.dataset.acao = 'confirmar';
    }
    observarBotao(salvo ? $('botao-editar') : $('botao-principal'));
  }

  // A barra fixa aparece só quando o botão grande não está na tela
  var observador = null;
  function observarBotao(botao) {
    var barra = $('barra');
    if (!('IntersectionObserver' in window)) { barra.classList.add('visivel'); return; }
    if (observador) observador.disconnect();
    observador = new IntersectionObserver(function (itens) {
      var visivel = itens[itens.length - 1].intersectionRatio >= 0.6;
      barra.classList.toggle('visivel', !visivel);
      $('barra-botao').tabIndex = visivel ? -1 : 0;
      barra.setAttribute('aria-hidden', visivel ? 'true' : 'false');
    }, { threshold: [0, 0.6, 1] });
    observador.observe(botao);
  }

  // O fim do convite não pode ficar escondido atrás da barra (que cresce com letra grande)
  function ajustarRodape() {
    $('convite').style.paddingBottom = ($('barra').offsetHeight + 36) + 'px';
  }
  window.addEventListener('resize', ajustarRodape);
  if ('ResizeObserver' in window) new ResizeObserver(ajustarRodape).observe($('barra'));

  /* ---------- Navegação entre as telas da confirmação ---------- */
  // Uma entrada só no histórico para o fluxo inteiro: o "voltar" do celular volta uma tela por vez
  // e, da primeira tela (ou da tela final), volta para o convite.

  // A rolagem é controlada aqui (o navegador restauraria a posição antiga por cima)
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) { /* ok */ }

  var TELAS = ['nome', 'escolha', 'nao-achou', 'quem', 'pronto'];
  var pilha = [];
  var noHistorico = false;
  var fechando = false;

  function render(tela) {
    TELAS.forEach(function (t) { $('tela-' + t).hidden = (t !== tela); });
    var el = $('tela-' + tela);
    el.classList.remove('entrando');
    void el.offsetWidth;
    el.classList.add('entrando');
    window.scrollTo(0, 0);
    var titulo = el.querySelector('.tela-pergunta');
    if (titulo) setTimeout(function () { titulo.focus({ preventScroll: true }); }, 30);
  }

  function irPara(tela) {
    if (pilha[pilha.length - 1] !== tela) pilha.push(tela);
    render(tela);
  }

  function trocarAtual(tela) {
    pilha[pilha.length - 1] = tela;
    render(tela);
  }

  function abrirFluxo(primeira) {
    pilha = [];
    $('convite').hidden = true;
    $('fluxo').hidden = false;
    irPara(primeira);
    try { history.pushState({ fluxo: true }, ''); noHistorico = true; } catch (e) { noHistorico = false; }
  }

  function fecharFluxo() {
    $('fluxo').hidden = true;
    $('convite').hidden = false;
    pilha = [];
    atualizarStatus();
    var alvo = lerSalvo() ? $('status-respondido') : $('status-aberto');
    alvo.scrollIntoView({ block: 'center' });
    alvo.focus({ preventScroll: true });
  }

  // Volta uma tela; devolve true se continuou dentro do fluxo
  function passoAtras() {
    var atual = pilha[pilha.length - 1];
    if (pilha.length > 1 && atual !== 'pronto') {
      pilha.pop();
      render(pilha[pilha.length - 1]);
      return true;
    }
    fecharFluxo();
    return false;
  }

  // Um "voltar" por vez: um segundo toque antes do anterior terminar tiraria a pessoa do site
  var navegando = false;
  function historicoVoltar() {
    navegando = true;
    setTimeout(function () { navegando = false; }, 1200);
    history.back();
  }

  function voltar() {
    if (navegando) return;
    if (noHistorico) historicoVoltar();
    else passoAtras();
  }

  function sair() {
    if (navegando) return;
    if (noHistorico) { fechando = true; historicoVoltar(); }
    else fecharFluxo();
  }

  window.addEventListener('popstate', function () {
    navegando = false;
    if ($('fluxo').hidden) return;
    noHistorico = false;
    if (fechando) { fechando = false; fecharFluxo(); return; }
    if (passoAtras()) {
      try { history.pushState({ fluxo: true }, ''); noHistorico = true; } catch (e) { /* segue sem histórico */ }
    }
  });

  /* ---------- Nome ---------- */

  var grupoAtual = null;
  var nomeDigitado = '';

  function comecar(nomeInicial) {
    grupoAtual = null;
    erro('erro-nome', '');
    $('nome').value = nomeInicial || '';
    abrirFluxo('nome');
  }

  $('tela-nome').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var nome = $('nome').value.trim();
    var botao = ev.currentTarget.querySelector('button[type="submit"]');
    if (nome.replace(/[^A-Za-zÀ-ÿ]/g, '').length < 2) {
      erro('erro-nome', 'Escreva seu primeiro nome no espaço acima e toque em “Continuar”.');
      $('erro-nome').scrollIntoView({ block: 'center' });
      return;
    }
    erro('erro-nome', '');
    ocupado(botao, true, 'Procurando...');
    chamar('GET', { acao: 'buscar', nome: nome })
      .then(function (r) {
        if (!r.ok) {
          if (r.erro === 'nome_curto') return erro('erro-nome', 'Escreva seu primeiro nome no espaço acima e toque em “Continuar”.');
          throw new Error(r.erro);
        }
        nomeDigitado = nome;
        if (r.grupos.length === 0) {
          $('texto-nao-achou').textContent = 'Confira se o nome “' + nome + '” está escrito certinho e tente de novo. ' +
            'Se ainda assim não encontrar, fale com ' + F.contato + '.';
          return irPara('nao-achou');
        }
        if (r.grupos.length === 1) return abrirGrupo(r.grupos[0]);
        mostrarEscolha(r.grupos);
      })
      .then(function () { falhasSeguidas = 0; ocupado(botao, false); },
        function () { erro('erro-nome', msgFalha()); ocupado(botao, false); });
  });

  /* ---------- Nome repetido ---------- */

  function mostrarEscolha(grupos) {
    var lista = $('lista-grupos');
    lista.innerHTML = '';
    grupos.forEach(function (g) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'grupo-botao';
      var t = document.createElement('strong');
      t.textContent = g.grupo;
      var s = document.createElement('span');
      s.textContent = juntarNomes(g.membros.map(function (m) { return m.nome; }));
      b.appendChild(t);
      b.appendChild(s);
      b.addEventListener('click', function () { abrirGrupo(g); });
      lista.appendChild(b);
    });
    irPara('escolha');
  }

  /* ---------- Quem vai ---------- */

  function abrirGrupo(g) {
    grupoAtual = g;
    erro('erro-envio', '');
    $('grupo-titulo').textContent = g.grupo;
    var caixa = $('pessoas');
    caixa.innerHTML = '';
    g.membros.forEach(function (m, i) {
      var fs = document.createElement('fieldset');
      fs.className = 'pessoa';
      fs.dataset.indice = i;
      var lg = document.createElement('legend');
      lg.textContent = m.nome;
      fs.appendChild(lg);
      var op = document.createElement('div');
      op.className = 'opcoes';
      [[VAI, 'Vai', 'vai'], [NAO_VAI, 'Não vai', 'nao']].forEach(function (o) {
        var lb = document.createElement('label');
        lb.className = 'opcao ' + o[2];
        var inp = document.createElement('input');
        inp.type = 'radio';
        inp.name = 'pessoa-' + i;
        inp.value = o[0];
        if (m.resposta === o[0]) inp.checked = true;
        inp.addEventListener('change', function () {
          fs.classList.remove('faltando');
          if (!document.querySelector('.pessoa.faltando')) erro('erro-envio', '');
        });
        var sp = document.createElement('span');
        sp.textContent = o[1];
        lb.appendChild(inp);
        lb.appendChild(sp);
        op.appendChild(lb);
      });
      fs.appendChild(op);
      caixa.appendChild(fs);
    });
    irPara('quem');
  }

  $('tela-quem').addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (!grupoAtual) return;
    var botao = ev.currentTarget.querySelector('button[type="submit"]');
    var respostas = [];
    var faltam = [];
    grupoAtual.membros.forEach(function (m, i) {
      var marcado = document.querySelector('input[name="pessoa-' + i + '"]:checked');
      var fs = document.querySelector('.pessoa[data-indice="' + i + '"]');
      fs.classList.toggle('faltando', !marcado);
      if (!marcado) faltam.push(m.nome);
      else respostas.push({ linha: m.linha, nome: m.nome, resposta: marcado.value });
    });
    if (faltam.length) {
      erro('erro-envio', 'Falta escolher “Vai” ou “Não vai” para ' + juntarNomes(faltam) + '. ' +
        (faltam.length > 1 ? 'Os nomes estão marcados' : 'O nome está marcado') + ' em vermelho acima.');
      document.querySelector('.pessoa.faltando').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    erro('erro-envio', '');
    ocupado(botao, true, 'Enviando...');
    chamar('POST', { acao: 'responder', grupo: grupoAtual.grupo, respostas: respostas })
      .then(function (r) {
        if (!r.ok) {
          if (r.erro === 'lista_mudou') return recarregarGrupo();
          throw new Error(r.erro);
        }
        salvar({ nome: nomeDigitado, grupo: r.grupo, respostas: r.respostas, em: new Date().toISOString() });
        if ($('fluxo').hidden) { atualizarStatus(); return; }   // a pessoa saiu enquanto enviava
        mostrarPronto(r);
      })
      .then(function () { falhasSeguidas = 0; ocupado(botao, false); },
        function () { erro('erro-envio', msgFalha()); ocupado(botao, false); });
  });

  // A planilha mudou entre a busca e o envio: busca de novo e reabre a família atualizada
  function recarregarGrupo() {
    var nomeGrupo = grupoAtual && grupoAtual.grupo;
    return chamar('GET', { acao: 'buscar', nome: nomeDigitado }).then(function (r) {
      var g = r.ok ? acharGrupo(r.grupos, nomeGrupo) : null;
      if (g) {
        abrirGrupo(g);
        erro('erro-envio', 'A lista de convidados foi atualizada. Confira as respostas e toque em “Confirmar resposta” de novo.');
      } else {
        pilha = ['nome'];
        render('nome');
        erro('erro-nome', 'A lista de convidados foi atualizada. Escreva seu primeiro nome de novo.');
      }
    });
  }

  /* ---------- Pronto ---------- */

  function mostrarPronto(r) {
    $('pronto-grupo').textContent = r.grupo;
    preencherLista($('pronto-lista'), r.respostas);
    var algumVai = r.respostas.some(function (x) { return x.resposta === VAI; });
    $('pronto-recado').textContent = algumVai
      ? 'Esperamos vocês no dia ' + formatar(inicio, { day: 'numeric', month: 'long' }) + '!'
      : 'Que pena! Vamos sentir saudade.';
    grupoAtual = null;
    trocarAtual('pronto');
  }

  /* ---------- Editar resposta ---------- */

  var abrindo = false;
  function editar(botao) {
    var salvo = lerSalvo();
    if (!salvo || !salvo.nome) return comecar('');
    abrindo = true;
    ocupado(botao, true, 'Abrindo...');
    chamar('GET', { acao: 'buscar', nome: salvo.nome })
      .then(function (r) {
        if (!$('fluxo').hidden) return;
        nomeDigitado = salvo.nome;
        var g = r.ok ? (acharGrupo(r.grupos, salvo.grupo) || (r.grupos.length === 1 ? r.grupos[0] : null)) : null;
        if (!g) {
          comecar(salvo.nome);
          erro('erro-nome', 'Não achamos sua família do jeito que estava. Confira o nome e toque em “Continuar”.');
          return;
        }
        pilha = [];
        $('convite').hidden = true;
        $('fluxo').hidden = false;
        try { history.pushState({ fluxo: true }, ''); noHistorico = true; } catch (e) { noHistorico = false; }
        abrirGrupo(g);
      })
      .then(function () { abrindo = false; falhasSeguidas = 0; ocupado(botao, false); },
        function () {
          abrindo = false;
          ocupado(botao, false);
          if (!$('fluxo').hidden) return;
          comecar(salvo.nome);
          erro('erro-nome', msgFalha());
        });
  }

  // Ao abrir o convite, confere a resposta guardada com a planilha (outra pessoa da família pode ter mudado)
  function sincronizar() {
    var salvo = lerSalvo();
    if (!salvo || !salvo.nome || F.api === 'simulado') return;
    chamar('GET', { acao: 'buscar', nome: salvo.nome }).then(function (r) {
      var g = r.ok ? acharGrupo(r.grupos, salvo.grupo) : null;
      if (!g) return;
      var respostas = g.membros.filter(function (m) { return m.resposta; })
        .map(function (m) { return { nome: m.nome, resposta: m.resposta }; });
      if (respostas.length === 0) {
        try { localStorage.removeItem(CHAVE); } catch (e) { /* nada */ }
      } else {
        salvar({ nome: salvo.nome, grupo: g.grupo, respostas: respostas, em: salvo.em });
      }
      atualizarStatus();
    }, function () { /* sem internet: fica o que está guardado */ });
  }

  /* ---------- Botões ---------- */

  document.addEventListener('click', function (ev) {
    var alvo = ev.target.closest('[data-acao]');
    if (!alvo) return;
    var acao = alvo.dataset.acao;
    if ((acao === 'confirmar' || acao === 'editar') && abrindo) return;
    if (acao === 'confirmar') comecar('');
    else if (acao === 'editar') editar(alvo);
    else if (acao === 'voltar') voltar();
    else if (acao === 'nome') { pilha = ['nome']; erro('erro-nome', ''); $('nome').value = ''; render('nome'); }
    else if (acao === 'fechar') sair();
  });

  preencherDatas();
  preencherLinks();
  atualizarStatus();
  ajustarRodape();
  sincronizar();
})();
