// Tudo o que pode mudar fica aqui. Horários no fuso de São Paulo (-03:00).
window.FESTA = {
  // Endereço do script da planilha (Apps Script > Implantar > App da Web).
  // "simulado" usa a planilha de mentira com a lista de teste (só para testar).
  api: 'https://script.google.com/macros/s/AKfycbzEimwRERDTfmCIuB9EQHz8Z1oPoWNdnz4IVIfM84otIF1kcfbTklf5RzaENAswVfUM/exec',

  inicio: '2027-01-09T12:00:00-03:00',
  fim: '2027-01-09T13:00:00-03:00',         // só para a agenda: evento de 1 hora como lembrete (a festa não tem horário de término)
  prazoConfirmacao: '2026-12-04',             // último dia para confirmar (sexta-feira)

  titulo: '1º aninho da Alice',
  endereco: 'Rua Vinícius de Morais, 15, Luxemburgo',
  enderecoMapa: 'Rua Vinícius de Morais, 15, Luxemburgo, Belo Horizonte, MG',
  contato: 'o Felipe ou a Teresa',
  // Botões de WhatsApp para quem se enrolar (número com 55 + DDD, só dígitos)
  whatsapp: [
    { nome: 'Felipe', numero: '5531998760109' },
    { nome: 'Teresa', numero: '5564992155118' }
  ],

  // Mapa do Google dentro do convite (a prévia no app do Claude não consegue mostrar, então desliga lá)
  mapaNaPagina: true
};
