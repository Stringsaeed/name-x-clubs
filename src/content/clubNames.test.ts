import { expect, test } from 'vitest';
import { clubs } from './catalog';
import { clubInitials, shortClubWords, startingLetters } from './clubNames';

test.each([
  ['Arsenal', 'A'],
  ['Manchester United', 'MU'],
  ['AC Milan', 'M'],
  ['Al Ahly', 'A'],
  ['FC Zenit Saint Petersburg', 'ZS'],
  ['1. FC Heidenheim 1846', 'H'],
  ['Club Social y Deportivo Colo-Colo', 'CC'],
  ['Club Atlético Rosario Central', 'RC'],
  ['Club Nacional de Football', 'N'],
  ['Associação Chapecoense de Futebol', 'C'],
  ['Al Sadd Sports Club', 'S'],
  ['F.C. Paços de Ferreira', 'PF'],
  ['Brighton & Hove Albion', 'BH'],
  ['Associação Académica de Coimbra – O.A.F.', 'AC'],
  ['Esporte Clube Bahia', 'B'],
])('crest initials of "%s" are %s', (name, initials) => {
  expect(clubInitials(name)).toBe(initials);
});

test('a name made only of boilerplate keeps its words', () => {
  expect(clubInitials('FC')).toBe('F');
  expect(shortClubWords('Club FC')).toEqual(['FC']);
});

test('every club in the catalog gets one or two capital initials', () => {
  const odd = clubs.filter((club) => !/^\p{Lu}{1,2}$/u.test(clubInitials(club.name)));

  expect(odd.map((club) => `${club.id} ${club.name} -> ${clubInitials(club.name)}`)).toEqual([]);
});

test('a name counts under its first letter and the first letter of its short form', () => {
  expect(startingLetters('FC Metalist Kharkiv')).toEqual(['f', 'm']);
  expect(startingLetters('Arsenal')).toEqual(['a']);
  expect(startingLetters('Al Ahly')).toEqual(['a']);
});
