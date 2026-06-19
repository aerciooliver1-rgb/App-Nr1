export type ScaleType = 'concordancia' | 'frequencia' | 'existencia'

export interface Question {
  id: string
  factorId: string
  text: string
  scale: ScaleType
  inversao: boolean
}

export interface Factor {
  id: string
  name: string
  dimension: string
  consequence: string
  questions: Question[]
}

export const SCALE_LABELS: Record<ScaleType, [string, string, string, string, string]> = {
  concordancia: ['Discordo totalmente', 'Discordo', 'Neutro', 'Concordo', 'Concordo totalmente'],
  frequencia: ['Nunca', 'Raramente', 'Às vezes', 'Frequentemente', 'Sempre'],
  existencia: ['Não existe', 'Existe pouco', 'Existe parcialmente', 'Existe', 'Existe plenamente'],
}

export const FACTORS: Factor[] = [
  {
    id: 'F01',
    name: 'Assédio de qualquer natureza no trabalho',
    dimension: 'Relações interpessoais e violência',
    consequence: 'Transtorno mental',
    questions: [
      { id: 'F01Q01', factorId: 'F01', text: 'Existem relatos ou registros de humilhação, intimidação ou tratamento degradante entre trabalhadores ou com gestores?', scale: 'frequencia', inversao: false },
      { id: 'F01Q02', factorId: 'F01', text: 'Os trabalhadores percebem situações de assédio sexual no ambiente de trabalho?', scale: 'frequencia', inversao: false },
      { id: 'F01Q03', factorId: 'F01', text: 'Há relatos de isolamento ou sabotagem intencional do trabalho de algum colega?', scale: 'frequencia', inversao: false },
      { id: 'F01Q04', factorId: 'F01', text: 'A organização dispõe de canal formal, seguro e sigiloso para denúncia de assédio?', scale: 'existencia', inversao: true },
      { id: 'F01Q05', factorId: 'F01', text: 'Os trabalhadores conhecem os procedimentos para denunciar situações de assédio?', scale: 'concordancia', inversao: true },
    ],
  },
  {
    id: 'F02',
    name: 'Má gestão de mudanças organizacionais',
    dimension: 'Organização e gestão do trabalho',
    consequence: 'Transtorno mental; DORT',
    questions: [
      { id: 'F02Q01', factorId: 'F02', text: 'As mudanças organizacionais são comunicadas com antecedência e de forma clara?', scale: 'concordancia', inversao: true },
      { id: 'F02Q02', factorId: 'F02', text: 'Os trabalhadores são consultados nas decisões sobre mudanças que afetam seu trabalho?', scale: 'concordancia', inversao: true },
      { id: 'F02Q03', factorId: 'F02', text: 'Mudanças recentes geraram sobrecarga, incerteza ou conflitos nas equipes?', scale: 'frequencia', inversao: false },
      { id: 'F02Q04', factorId: 'F02', text: 'Há suporte (treinamento, acompanhamento) para adaptação às novas condições?', scale: 'concordancia', inversao: true },
    ],
  },
  {
    id: 'F03',
    name: 'Baixa clareza de papel/função',
    dimension: 'Papel e clareza organizacional',
    consequence: 'Transtorno mental',
    questions: [
      { id: 'F03Q01', factorId: 'F03', text: 'Os trabalhadores sabem exatamente quais são suas responsabilidades e o que se espera deles?', scale: 'concordancia', inversao: true },
      { id: 'F03Q02', factorId: 'F03', text: 'Há situações em que diferentes gestores fazem exigências contraditórias ao mesmo trabalhador?', scale: 'frequencia', inversao: false },
      { id: 'F03Q03', factorId: 'F03', text: 'As descrições de cargo estão atualizadas e refletem as atividades realmente realizadas?', scale: 'concordancia', inversao: true },
      { id: 'F03Q04', factorId: 'F03', text: 'Os trabalhadores sabem claramente a quem devem se reportar em cada situação?', scale: 'concordancia', inversao: true },
    ],
  },
  {
    id: 'F04',
    name: 'Baixas recompensas e reconhecimento',
    dimension: 'Suporte e reconhecimento',
    consequence: 'Transtorno mental',
    questions: [
      { id: 'F04Q01', factorId: 'F04', text: 'Os trabalhadores recebem feedback regular e positivo sobre seu desempenho?', scale: 'concordancia', inversao: true },
      { id: 'F04Q02', factorId: 'F04', text: 'Existe desequilíbrio percebido entre o esforço e a remuneração ou reconhecimento recebidos?', scale: 'concordancia', inversao: false },
      { id: 'F04Q03', factorId: 'F04', text: 'A organização possui práticas formais de reconhecimento de bons resultados?', scale: 'existencia', inversao: true },
      { id: 'F04Q04', factorId: 'F04', text: 'Os trabalhadores percebem oportunidades reais de crescimento na organização?', scale: 'concordancia', inversao: true },
    ],
  },
  {
    id: 'F05',
    name: 'Falta de suporte/apoio no trabalho',
    dimension: 'Suporte social e liderança',
    consequence: 'Transtorno mental',
    questions: [
      { id: 'F05Q01', factorId: 'F05', text: 'As lideranças oferecem apoio emocional e técnico quando os trabalhadores enfrentam dificuldades?', scale: 'concordancia', inversao: true },
      { id: 'F05Q02', factorId: 'F05', text: 'Os colegas se ajudam mutuamente para resolver problemas do dia a dia?', scale: 'concordancia', inversao: true },
      { id: 'F05Q03', factorId: 'F05', text: 'Os trabalhadores se sentem à vontade para pedir ajuda sem receio de julgamento?', scale: 'concordancia', inversao: true },
      { id: 'F05Q04', factorId: 'F05', text: 'A organização disponibiliza recursos necessários para a realização adequada do trabalho?', scale: 'concordancia', inversao: true },
    ],
  },
  {
    id: 'F06',
    name: 'Baixo controle no trabalho / Falta de autonomia',
    dimension: 'Controle sobre o trabalho',
    consequence: 'Transtorno mental; DORT',
    questions: [
      { id: 'F06Q01', factorId: 'F06', text: 'Os trabalhadores têm autonomia para organizar suas tarefas, prioridades e método de trabalho?', scale: 'concordancia', inversao: true },
      { id: 'F06Q02', factorId: 'F06', text: 'O trabalho é realizado de forma muito monótona, repetitiva e sem variação?', scale: 'concordancia', inversao: false },
      { id: 'F06Q03', factorId: 'F06', text: 'Os trabalhadores participam das decisões que afetam diretamente seu trabalho?', scale: 'concordancia', inversao: true },
      { id: 'F06Q04', factorId: 'F06', text: 'Os trabalhadores podem pausar a atividade quando necessário, sem penalização?', scale: 'concordancia', inversao: true },
    ],
  },
  {
    id: 'F07',
    name: 'Baixa justiça organizacional',
    dimension: 'Cultura e valores organizacionais',
    consequence: 'Transtorno mental',
    questions: [
      { id: 'F07Q01', factorId: 'F07', text: 'As decisões sobre promoções e reconhecimento são tomadas de forma justa e imparcial?', scale: 'concordancia', inversao: true },
      { id: 'F07Q02', factorId: 'F07', text: 'Há percepção de favoritismo ou tratamento diferenciado injusto entre trabalhadores?', scale: 'concordancia', inversao: false },
      { id: 'F07Q03', factorId: 'F07', text: 'Os trabalhadores sentem que podem questionar decisões que consideram injustas?', scale: 'concordancia', inversao: true },
    ],
  },
  {
    id: 'F08',
    name: 'Eventos violentos ou traumáticos',
    dimension: 'Relações interpessoais e violência',
    consequence: 'Transtorno mental',
    questions: [
      { id: 'F08Q01', factorId: 'F08', text: 'Os trabalhadores estão expostos a risco de violência física, ameaças ou roubos no trabalho?', scale: 'frequencia', inversao: false },
      { id: 'F08Q02', factorId: 'F08', text: 'A organização adota medidas específicas de proteção para trabalhadores expostos a risco de violência?', scale: 'existencia', inversao: true },
      { id: 'F08Q03', factorId: 'F08', text: 'Após eventos traumáticos, a organização oferece suporte psicológico aos trabalhadores?', scale: 'existencia', inversao: true },
    ],
  },
  {
    id: 'F09',
    name: 'Baixa demanda no trabalho (subcarga)',
    dimension: 'Demandas do trabalho',
    consequence: 'Transtorno mental',
    questions: [
      { id: 'F09Q01', factorId: 'F09', text: 'Os trabalhadores consideram que suas funções não aproveitam adequadamente suas habilidades?', scale: 'concordancia', inversao: false },
      { id: 'F09Q02', factorId: 'F09', text: 'Há percepção de trabalho muito pouco desafiador ou sem propósito?', scale: 'concordancia', inversao: false },
      { id: 'F09Q03', factorId: 'F09', text: 'Existem funções com tempo ocioso excessivo ou atividades insuficientes na jornada?', scale: 'concordancia', inversao: false },
    ],
  },
  {
    id: 'F10',
    name: 'Excesso de demandas no trabalho (sobrecarga)',
    dimension: 'Demandas do trabalho',
    consequence: 'Transtorno mental; DORT',
    questions: [
      { id: 'F10Q01', factorId: 'F10', text: 'Os trabalhadores frequentemente precisam realizar horas extras para cumprir as demandas?', scale: 'frequencia', inversao: false },
      { id: 'F10Q02', factorId: 'F10', text: 'O ritmo de trabalho é muito acelerado ou há pressão intensa e constante de prazos?', scale: 'concordancia', inversao: false },
      { id: 'F10Q03', factorId: 'F10', text: 'Os trabalhadores deixam de fazer intervalos para dar conta das demandas?', scale: 'frequencia', inversao: false },
      { id: 'F10Q04', factorId: 'F10', text: 'O volume de trabalho exigido é compatível com o tempo disponível e a capacidade das equipes?', scale: 'concordancia', inversao: true },
      { id: 'F10Q05', factorId: 'F10', text: 'Há acúmulo de tarefas de diferentes gestores que gera conflito de prioridades?', scale: 'frequencia', inversao: false },
    ],
  },
  {
    id: 'F11',
    name: 'Más relações no local de trabalho',
    dimension: 'Relações interpessoais e violência',
    consequence: 'Transtorno mental',
    questions: [
      { id: 'F11Q01', factorId: 'F11', text: 'Conflitos interpessoais são frequentes e afetam negativamente o clima e o desempenho?', scale: 'frequencia', inversao: false },
      { id: 'F11Q02', factorId: 'F11', text: 'O ambiente de trabalho é predominantemente respeitoso, colaborativo e de confiança mútua?', scale: 'concordancia', inversao: true },
      { id: 'F11Q03', factorId: 'F11', text: 'Há comportamentos de exclusão, fofoca ou tratamento hostil entre colegas?', scale: 'frequencia', inversao: false },
      { id: 'F11Q04', factorId: 'F11', text: 'A organização intervém de forma efetiva na resolução de conflitos nas equipes?', scale: 'concordancia', inversao: true },
    ],
  },
  {
    id: 'F12',
    name: 'Trabalho em condições de difícil comunicação',
    dimension: 'Organização e gestão do trabalho',
    consequence: 'Transtorno mental',
    questions: [
      { id: 'F12Q01', factorId: 'F12', text: 'As condições do trabalho dificultam a comunicação entre trabalhadores e equipes?', scale: 'concordancia', inversao: false },
      { id: 'F12Q02', factorId: 'F12', text: 'Os trabalhadores recebem as informações necessárias para o trabalho de forma clara e oportuna?', scale: 'concordancia', inversao: true },
      { id: 'F12Q03', factorId: 'F12', text: 'Há canais de comunicação adequados para equipes em turnos distintos ou em trabalho remoto?', scale: 'existencia', inversao: true },
    ],
  },
  {
    id: 'F13',
    name: 'Trabalho remoto e isolado',
    dimension: 'Organização e gestão do trabalho',
    consequence: 'Transtorno mental; Fadiga',
    questions: [
      { id: 'F13Q01', factorId: 'F13', text: 'Trabalhadores remotos reportam sensação de isolamento ou falta de conexão com a equipe?', scale: 'frequencia', inversao: false },
      { id: 'F13Q02', factorId: 'F13', text: 'A organização estabelece limites claros de horário e disponibilidade para trabalhadores remotos?', scale: 'existencia', inversao: true },
      { id: 'F13Q03', factorId: 'F13', text: 'Trabalhadores remotos têm as mesmas oportunidades de desenvolvimento e reconhecimento?', scale: 'concordancia', inversao: true },
      { id: 'F13Q04', factorId: 'F13', text: 'Há práticas sistemáticas de integração social para trabalhadores remotos ou isolados?', scale: 'existencia', inversao: true },
    ],
  },
]

export const QUESTIONS_MAP = new Map(
  FACTORS.flatMap(f => f.questions.map(q => [q.id, q]))
)

export const TOTAL_QUESTIONS = FACTORS.reduce((sum, f) => sum + f.questions.length, 0)
