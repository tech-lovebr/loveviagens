/* ==========================================================================
   LOVE VIAGENS — Pacotes de demonstração
   Usados só quando a tabela `viagens_pacotes` do Supabase não devolve nada
   (ou ainda não dá para acessá-la), para a vitrine não ficar vazia em
   localhost. Os pacotes reais são cadastrados no Admin › Love Viagens.
   Os ids começam com "demo-" para o checkout saber que é simulação.
   ========================================================================== */

const PACOTES_DEMO = [
  {
    id: 'demo-fernando-de-noronha',
    titulo: 'Lua de mel em Fernando de Noronha',
    destino: 'Fernando de Noronha, PE',
    descricao: 'Sete noites em pousada de charme com vista para o mar, passeio de barco pelas praias mais bonitas do Brasil e mergulho guiado no Sueste. Pensado para casais que querem desacelerar depois da festa.',
    imagem_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
    preco: 9800, preco_de: 11500, parcelas: 10,
    duracao_noites: 7, vagas: 12, vagas_vendidas: 7,
    inclui: ['Aéreo ida e volta saindo de Recife', 'Pousada com café da manhã', 'Passeio de barco', 'Mergulho com cilindro', 'Taxa de preservação ambiental'],
    tipo: 'lua_de_mel', destaque: true, posicao: 1, ativo: true
  },
  {
    id: 'demo-gramado-canela',
    titulo: 'Serra Gaúcha a dois',
    destino: 'Gramado e Canela, RS',
    descricao: 'Quatro noites em hotel boutique no centro de Gramado, com jantar harmonizado em vinícola do Vale dos Vinhedos e passeio de Maria Fumaça.',
    imagem_url: 'https://images.unsplash.com/photo-1626222264004-2f2a1b2d3b0c?auto=format&fit=crop&w=1200&q=80',
    preco: 4200, preco_de: null, parcelas: 6,
    duracao_noites: 4, vagas: 20, vagas_vendidas: 4,
    inclui: ['Hotel boutique com café', 'Jantar harmonizado', 'Maria Fumaça com almoço', 'Transfer aeroporto'],
    tipo: 'lua_de_mel', destaque: false, posicao: 2, ativo: true
  },
  {
    id: 'demo-trancoso-destination',
    titulo: 'Destination wedding em Trancoso',
    destino: 'Trancoso, BA',
    descricao: 'Pacote para o casal e até 20 convidados: cerimônia na praia, hospedagem no Quadrado e coordenação completa no dia. A viagem que vira o próprio casamento.',
    imagem_url: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=80',
    preco: 38000, preco_de: 45000, parcelas: 12,
    duracao_noites: 5, vagas: 4, vagas_vendidas: 1,
    inclui: ['Hospedagem do casal (5 noites)', 'Espaço e cerimonial na praia', 'Decoração base', 'Coordenação do dia', 'Tarifa especial para convidados'],
    tipo: 'destination_wedding', destaque: true, posicao: 3, ativo: true
  },
  {
    id: 'demo-maldivas',
    titulo: 'Maldivas: bangalô sobre a água',
    destino: 'Atol de Malé, Maldivas',
    descricao: 'Sete noites em resort com bangalô sobre a água, regime all inclusive, hidroavião e um jantar privativo na areia. O clássico de lua de mel.',
    imagem_url: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1200&q=80',
    preco: 32500, preco_de: null, parcelas: 12,
    duracao_noites: 7, vagas: 8, vagas_vendidas: 8,
    inclui: ['Aéreo internacional', 'Bangalô sobre a água', 'All inclusive', 'Transfer de hidroavião', 'Jantar privativo'],
    tipo: 'lua_de_mel', destaque: true, posicao: 4, ativo: true
  },
  {
    id: 'demo-balao-capadocia',
    titulo: 'Experiência: balão na Capadócia',
    destino: 'Capadócia, Turquia',
    descricao: 'Cinco noites em hotel-caverna, voo de balão ao nascer do sol e roteiro por Istambul. Para casais que preferem aventura a resort.',
    imagem_url: 'https://images.unsplash.com/photo-1527838832700-5059252407fa?auto=format&fit=crop&w=1200&q=80',
    preco: 14900, preco_de: 16800, parcelas: 10,
    duracao_noites: 8, vagas: 10, vagas_vendidas: 3,
    inclui: ['Aéreo internacional', 'Hotel-caverna (5 noites)', 'Istambul (3 noites)', 'Voo de balão', 'Guia em português'],
    tipo: 'experiencia', destaque: false, posicao: 5, ativo: true
  },
  {
    id: 'demo-jericoacoara',
    titulo: 'Jericoacoara com pôr do sol na duna',
    destino: 'Jericoacoara, CE',
    descricao: 'Cinco noites em pousada pé na areia, passeio de buggy pelas lagoas e kitesurf para iniciantes. Boa opção para quem quer sol o ano inteiro.',
    imagem_url: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=1200&q=80',
    preco: 5600, preco_de: null, parcelas: 8,
    duracao_noites: 5, vagas: 16, vagas_vendidas: 9,
    inclui: ['Aéreo para Fortaleza', 'Transfer 4x4 até Jeri', 'Pousada com café', 'Passeio de buggy'],
    tipo: 'lua_de_mel', destaque: false, posicao: 6, ativo: true
  },
  {
    id: 'demo-vinhos-mendoza',
    titulo: 'Rota dos vinhos em Mendoza',
    destino: 'Mendoza, Argentina',
    descricao: 'Quatro noites em hotel vinícola ao pé dos Andes, degustações em três bodegas e um almoço de seis tempos entre parreirais.',
    imagem_url: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1200&q=80',
    preco: 7900, preco_de: 8900, parcelas: 10,
    duracao_noites: 4, vagas: 14, vagas_vendidas: 2,
    inclui: ['Aéreo internacional', 'Hotel vinícola', 'Tour por 3 bodegas', 'Almoço harmonizado'],
    tipo: 'experiencia', destaque: false, posicao: 7, ativo: true
  },
  {
    id: 'demo-fim-de-semana-paraty',
    titulo: 'Fim de semana em Paraty',
    destino: 'Paraty, RJ',
    descricao: 'Duas noites no centro histórico, passeio de escuna pelas ilhas e jantar em restaurante de chef. Presente certo para quem não pode viajar longe agora.',
    imagem_url: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=1200&q=80',
    preco: 1890, preco_de: null, parcelas: 4,
    duracao_noites: 2, vagas: 30, vagas_vendidas: 11,
    inclui: ['Pousada no centro histórico', 'Passeio de escuna', 'Jantar de chef'],
    tipo: 'outro', destaque: false, posicao: 8, ativo: true
  }
];
