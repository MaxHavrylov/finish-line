/**
 * Mock providers data
 */
export interface Provider {
  id: string;
  name: string;
  logoUrl: string;
  website: string;
}

export const mockProviders: Provider[] = [
  {
    id: 'spartan',
    name: 'Spartan Race',
    logoUrl: '',
    website: 'https://www.spartan.com'
  },
  {
    id: 'ironman',
    name: 'IRONMAN',
    logoUrl: '',
    website: 'https://www.ironman.com'
  }
];