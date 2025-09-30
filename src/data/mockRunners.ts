export interface Runner {
  id: string;
  name: string;
  location: string;
  stats?: {
    races: number;
    prs: number;
  };
}

// Helper to create deterministic runners
function createRunner(index: number): Runner {
  const cities = [
    "Prague", "Brno", "Kyiv", "Warsaw", "Vienna", "Budapest", "Berlin", 
    "Bratislava", "Krakow", "Ostrava", "Lviv", "Pardubice", "Košice"
  ];
  
  const firstNames = [
    "Jan", "Petr", "Tomáš", "Jakub", "Martin", "Michal", "Pavel", 
    "Anna", "Marie", "Katerina", "Eva", "Lucie", "Jana",
    "Oleksandr", "Dmytro", "Andriy", "Vasyl", "Mykola", 
    "Oksana", "Natalia", "Yulia", "Olena", "Maria",
    "Piotr", "Krzysztof", "Adam", "Marek", "Tomasz", "Agnieszka", "Karolina"
  ];
  
  const lastNames = [
    "Novák", "Svoboda", "Novotný", "Dvořák", "Černý",
    "Kovalenko", "Shevchenko", "Bondarenko", "Tkachuk", "Melnyk",
    "Kowalski", "Nowak", "Wiśniewski", "Wójcik", "Kowalczyk",
    "Horáček", "Kučera", "Veselý", "Marek", "Šimek"
  ];
  
  // Deterministic selection based on index
  const firstName = firstNames[index % firstNames.length];
  const lastName = lastNames[Math.floor(index / 3) % lastNames.length];
  const city = cities[Math.floor(index / 2) % cities.length];
  
  // Generate deterministic but varied stats
  const hasStats = index % 10 !== 9; // 90% of runners have stats
  const races = ((index % 7) + 1) * ((index % 3) + 1);
  const prs = Math.min(Math.floor(races / 2) + (index % 2), races);
  
  return {
    id: `runner-${index + 1}`,
    name: `${firstName} ${lastName}`,
    location: city,
    ...(hasStats && { stats: { races, prs } })
  };
}

// Generate 50 runners
export const mockRunners: Runner[] = Array.from({ length: 50 }, (_, i) => createRunner(i));
