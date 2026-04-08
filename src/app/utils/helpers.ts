export const normalizeEmail = (value: string | null | undefined): string =>
	String(value || '').trim().toLowerCase();

export const asDate = (value: unknown, fallback = new Date()): Date => {
	if (value instanceof Date) {
		return value;
	}

	if (value && typeof value === 'object' && 'toDate' in (value as any)) {
		return (value as any).toDate();
	}

	const parsed = new Date(String(value ?? ''));
	return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

export const uniqueStrings = (values: string[]): string[] => {
	return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
};

export const sortByDateDesc = <T>(items: T[], selector: (item: T) => Date): T[] => {
	return [...items].sort((a, b) => selector(b).getTime() - selector(a).getTime());
};
