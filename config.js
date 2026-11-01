// Tudo o que pode mudar fica aqui. Horários no fuso de São Paulo (-03:00).
window.FESTA = {
  // Endereço do script da planilha (Apps Script > Implantar > App da Web).
  // "simulado" usa a planilha de mentira com a lista de teste (só para testar).
  api: 'https://script.google.com/macros/s/AKfycbzEimwRERDTfmCIuB9EQHz8Z1oPoWNdnz4IVIfM84otIF1kcfbTklf5RzaENAswVfUM/exec',

  inicio: '2027-01-09T12:00:00-03:00',
  fim: '2027-01-09T17:00:00-03:00',         // PROVISÓRIO: horário de término ainda não decidido
  prazoConfirmacao: '2026-12-20',             // PROVISÓRIO: último dia para confirmar

  titulo: '1º aninho da Alice',
  endereco: 'Rua Vinícius de Morais, 15, Luxemburgo',
  enderecoMapa: 'Rua Vinícius de Morais, 15, Luxemburgo, Belo Horizonte, MG',
  contato: 'o Felipe ou a Teresa',

  // Mapa do Google dentro do convite (a prévia no app do Claude não consegue mostrar, então desliga lá)
  mapaNaPagina: true
};
