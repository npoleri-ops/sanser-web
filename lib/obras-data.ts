export type ObraCategory = 'Dos Aguas' | 'Un Agua' | 'Reticulado' | 'Galpones' | 'Taller';

export interface Obra {
  id: string;
  title: string;
  category: ObraCategory;
  src: string;
}

export const OBRAS_DATA: Obra[] = [
  // Dos Aguas
  { id: 'da-1', title: 'Estructura Dos Aguas 1', category: 'Dos Aguas', src: '/obras/Dos Aguas/1d.png' },
  { id: 'da-2', title: 'Estructura Dos Aguas 2', category: 'Dos Aguas', src: '/obras/Dos Aguas/2d.png' },
  { id: 'da-3', title: 'Estructura Dos Aguas 3', category: 'Dos Aguas', src: '/obras/Dos Aguas/3d.png' },
  { id: 'da-4', title: 'Estructura Dos Aguas 4', category: 'Dos Aguas', src: '/obras/Dos Aguas/4d.jpg' },
  { id: 'da-5', title: 'Estructura Dos Aguas 5', category: 'Dos Aguas', src: '/obras/Dos Aguas/5d.jpg' },
  { id: 'da-6', title: 'Estructura Dos Aguas 6', category: 'Dos Aguas', src: '/obras/Dos Aguas/6d.png' },
  { id: 'da-7', title: 'Estructura Dos Aguas 7', category: 'Dos Aguas', src: '/obras/Dos Aguas/7d.png' },

  // Galpones
  { id: 'g-1', title: 'Galpón 1', category: 'Galpones', src: '/obras/Galpones/1g.png' },
  { id: 'g-2', title: 'Galpón 2', category: 'Galpones', src: '/obras/Galpones/2g.png' },
  { id: 'g-3', title: 'Galpón 3', category: 'Galpones', src: '/obras/Galpones/3g.png' },

  // Un Agua
  { id: 'ua-1', title: 'Estructura Un Agua 1', category: 'Un Agua', src: '/obras/Un Agua/1a.png' },
  { id: 'ua-2', title: 'Estructura Un Agua 2', category: 'Un Agua', src: '/obras/Un Agua/2a.png' },
  { id: 'ua-3', title: 'Estructura Un Agua 3', category: 'Un Agua', src: '/obras/Un Agua/3a.jpg' },
  { id: 'ua-4', title: 'Estructura Un Agua 4', category: 'Un Agua', src: '/obras/Un Agua/4a.jpg' },
  { id: 'ua-5', title: 'Estructura Un Agua 5', category: 'Un Agua', src: '/obras/Un Agua/5a.jpg' },
  { id: 'ua-6', title: 'Estructura Un Agua 6', category: 'Un Agua', src: '/obras/Un Agua/6a.jpg' },
  { id: 'ua-9', title: 'Estructura Un Agua 9', category: 'Un Agua', src: '/obras/Un Agua/9a.jpeg' },
  { id: 'ua-10', title: 'Estructura Un Agua 10', category: 'Un Agua', src: '/obras/Un Agua/10a.jpeg' },
];
