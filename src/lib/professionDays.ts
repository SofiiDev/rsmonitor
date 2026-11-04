// Días de las profesiones en Argentina.
// Fuente: calendario "Día de los profesionales y trabajadores" (estudiochaiman.com.ar,
// basado en carrerasytrabajos.com.ar). Varias fechas las fijan colegios o gremios y
// pueden variar: para corregir una, cambiá `date` (formato 'MM-DD').
//
// `match` son fragmentos que se buscan en la profesión del contacto, sin tildes ni
// mayúsculas. Un fragmento entre barras (\b) exige palabra completa: '\\bing\\b'
// reconoce "Ing. Química" pero no "inglés".

export interface ProfessionDay {
  date: string; // 'MM-DD'
  label: string;
  match: string[];
}

export const PROFESSION_DAYS: ProfessionDay[] = [
  // Salud
  { date: '12-03', label: 'Día del Médico', match: ['medic', 'doctor', 'cirujan', 'pediatra', 'cardiolog', 'traumatolog', 'ginecolog', 'dermatolog', 'clinico'] },
  { date: '11-21', label: 'Día de la Enfermería', match: ['enfermer'] },
  { date: '10-03', label: 'Día del Odontólogo', match: ['odontolog', 'dentist', 'ortodonc'] },
  { date: '10-13', label: 'Día del Psicólogo', match: ['psicolog'] },
  { date: '04-13', label: 'Día del Kinesiólogo', match: ['kinesiolog', 'fisioterap'] },
  { date: '05-12', label: 'Día de la Fonoaudiología', match: ['fonoaudiolog'] },
  { date: '08-31', label: 'Día de la Obstétrica', match: ['obstetr', 'partera'] },
  { date: '08-11', label: 'Día del Nutricionista', match: ['nutricion', 'dietist'] },
  { date: '10-12', label: 'Día del Farmacéutico', match: ['farmac'] },
  { date: '06-15', label: 'Día del Bioquímico', match: ['bioquimic'] },
  { date: '11-08', label: 'Día del Técnico Radiólogo', match: ['radiolog'] },
  { date: '09-10', label: 'Día del Terapista Ocupacional', match: ['terapista ocupacional', 'terapeuta ocupacional'] },
  { date: '12-16', label: 'Día del Óptico', match: ['optic'] },
  { date: '08-06', label: 'Día del Veterinario', match: ['veterinari'] },
  { date: '05-26', label: 'Día del Agente de Propaganda Médica', match: ['visitador', 'propaganda medica'] },

  // Educación
  { date: '09-11', label: 'Día del Maestro', match: ['maestr', 'docent'] },
  { date: '09-17', label: 'Día del Profesor', match: ['profesor'] },
  { date: '09-17', label: 'Día del Psicopedagogo', match: ['psicopedagog'] }, // no figura en la fuente; fecha usual en Argentina
  { date: '05-28', label: 'Día de la Maestra Jardinera', match: ['jardiner', 'nivel inicial'] },
  { date: '09-19', label: 'Día del Preceptor', match: ['preceptor'] },
  { date: '09-28', label: 'Día del Rector', match: ['\\brector'] },
  { date: '09-13', label: 'Día del Bibliotecario', match: ['bibliotecari'] },

  // Derecho, economía y empresa
  { date: '08-29', label: 'Día del Abogado', match: ['abogad', 'letrad'] },
  { date: '08-14', label: 'Día del Empleado Judicial', match: ['judicial', 'tribunal', 'juzgado'] },
  { date: '12-17', label: 'Día del Contador', match: ['contad'] },
  { date: '06-02', label: 'Día del Graduado en Ciencias Económicas', match: ['contad', 'economist', 'administracion de empresas', 'administrador de empresas', 'ciencias economicas', 'actuari'] },
  { date: '11-06', label: 'Día del Bancario', match: ['bancari', 'banco'] },
  { date: '12-07', label: 'Día del Agente Bursátil', match: ['bursatil', 'broker', 'agente de bolsa'] },
  { date: '09-28', label: 'Día del Productor de Seguros', match: ['productor de seguros', 'productora de seguros', 'seguros'] },
  { date: '12-11', label: 'Día del Ejecutivo', match: ['ejecutiv', 'gerente', '\\bceo\\b'] },
  { date: '09-04', label: 'Día de la Secretaria', match: ['secretari'] },
  { date: '09-29', label: 'Día del Diplomático', match: ['diplomat', '\\bconsul\\b', 'embajad'] },
  { date: '09-30', label: 'Día del Traductor', match: ['traductor'] },
  { date: '06-01', label: 'Día del Trabajador Aduanero', match: ['aduaner'] },
  { date: '08-20', label: 'Día del Despachante de Aduana', match: ['despachante'] },

  // Inmobiliario, comercio y ventas
  { date: '10-11', label: 'Día del Martillero Público', match: ['martiller', 'corredor inmobiliario', 'corredora inmobiliaria', 'inmobiliari'] },
  { date: '09-26', label: 'Día del Empleado de Comercio', match: ['empleado de comercio', 'empleada de comercio', 'comercian'] },
  { date: '10-01', label: 'Día del Vendedor', match: ['vendedor', 'vendedora', 'ventas'] },
  { date: '04-27', label: 'Día del Agente de Viajes', match: ['agente de viajes', 'turismo'] },
  { date: '09-21', label: 'Día del Almacenero', match: ['almacen'] },
  { date: '09-03', label: 'Día del Ferretero', match: ['ferreter'] },

  // Ingeniería, arquitectura y ciencia
  { date: '06-16', label: 'Día del Ingeniero', match: ['ingenier', '\\bing\\b'] },
  { date: '08-06', label: 'Día del Ingeniero Agrónomo', match: ['agronom'] },
  { date: '11-08', label: 'Día del Arquitecto', match: ['arquitect'] },
  { date: '11-26', label: 'Día del Técnico Químico', match: ['tecnico quimico', 'tecnica quimica'] },
  { date: '06-09', label: 'Día del Geólogo', match: ['geolog'] },
  { date: '06-27', label: 'Día del Biólogo', match: ['biolog'] },
  { date: '04-09', label: 'Día del Investigador', match: ['investigador', 'cientific'] },
  { date: '11-10', label: 'Día del Dibujante', match: ['dibujant'] },
  { date: '10-24', label: 'Día del Diseñador Gráfico / Industrial', match: ['disenad', 'diseno grafico', 'diseno industrial'] },

  // Comunicación y cultura
  { date: '06-07', label: 'Día del Periodista', match: ['periodist'] },
  { date: '07-03', label: 'Día del Locutor', match: ['locutor'] },
  { date: '09-21', label: 'Día del Fotógrafo', match: ['fotograf'] },
  { date: '11-22', label: 'Día del Músico', match: ['music'] },
  { date: '06-13', label: 'Día del Escritor', match: ['escritor'] },
  { date: '08-26', label: 'Día del Actor', match: ['\\bactor\\b', 'actriz'] },
  { date: '07-01', label: 'Día del Historiador', match: ['historiador'] },
  { date: '07-02', label: 'Día del Asistente Social', match: ['asistente social', 'trabajador social', 'trabajadora social'] },

  // Oficios y servicios
  { date: '08-25', label: 'Día del Peluquero', match: ['peluquer', 'estilista'] },
  { date: '08-04', label: 'Día del Panadero', match: ['panader'] },
  { date: '08-02', label: 'Día del Trabajador Gastronómico', match: ['gastronom', 'cociner', '\\bchef\\b', 'mozo', 'moza'] },
  { date: '04-22', label: 'Día del Trabajador de la Construcción', match: ['construcc', 'albanil', 'maestro mayor de obra'] },
  { date: '03-19', label: 'Día del Carpintero', match: ['carpinter'] },
  { date: '02-24', label: 'Día del Mecánico', match: ['mecanic'] },
  { date: '09-07', label: 'Día del Trabajador Metalúrgico', match: ['metalurg'] },
  { date: '05-07', label: 'Día del Taxista', match: ['taxi'] },
  { date: '09-24', label: 'Día del Colectivero', match: ['colectiver', 'chofer de colectivo'] },
  { date: '12-15', label: 'Día del Camionero', match: ['camioner'] },
  { date: '03-27', label: 'Día del Trabajador Aeronáutico', match: ['aeronaut', 'piloto', 'azafat', 'tripulante'] },
  { date: '07-07', label: 'Día del Agente de Policía', match: ['polic'] },
  { date: '06-02', label: 'Día del Bombero Voluntario', match: ['bomber'] },
  { date: '11-08', label: 'Día del Trabajador Municipal', match: ['municipal'] },
  { date: '10-02', label: 'Día del Trabajador de Edificios', match: ['encargado de edificio', 'portero', 'encargada de edificio'] },
  { date: '10-08', label: 'Día del Trabajador Rural', match: ['rural', 'productor agropecuario', 'agricultor'] },
];

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Días profesionales que corresponden a la profesión escrita en la ficha. */
export function professionDaysFor(occupation: string | null | undefined): ProfessionDay[] {
  if (!occupation?.trim()) return [];
  const text = normalize(occupation);
  return PROFESSION_DAYS.filter((d) =>
    d.match.some((m) => (m.includes('\\b') ? new RegExp(m).test(text) : text.includes(m))),
  );
}

const dayFmt = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long' });

export function formatProfessionDate(mmdd: string): string {
  const [m, d] = mmdd.split('-').map(Number);
  return dayFmt.format(new Date(2000, m - 1, d));
}
