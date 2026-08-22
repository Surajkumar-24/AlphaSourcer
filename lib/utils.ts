export function nanoid(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function getMatchStrengthLabel(score: number): 'excellent' | 'strong' | 'potential' | 'low' {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'strong';
  if (score >= 60) return 'potential';
  return 'low';
}

export function getMatchStrengthColor(strength: string): string {
  switch (strength) {
    case 'excellent':
      return 'bg-green-100 text-green-800';
    case 'strong':
      return 'bg-blue-100 text-blue-800';
    case 'potential':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
}

export function classNames(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
