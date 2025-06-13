import {
	Combobox,
	ComboboxInput,
	ComboboxOption,
	ComboboxOptions,
} from '@headlessui/react';
import { useMemo, useState } from 'react';
import type { Ingredient } from '../schema';
import { useQuery } from './StoreProvider';

export function IngredientCombobox({
	onSelect,
}: {
	onSelect: (ingredient: Ingredient) => void;
}) {
	const [query, setQuery] = useState('');

	const { data: ingredients } = useQuery('ingredients', {
		where: (i) => !i.isDeleted,
	});

	const options = useMemo(
		() =>
			ingredients.filter((i) =>
				i.name.toLowerCase().includes(query.toString()),
			),
		[ingredients, query],
	);

	return (
		<Combobox
			onChange={(ingredient: Ingredient) => {
				if (ingredient) {
					onSelect(ingredient);
				}
				// setQuery('');
			}}
		>
			<ComboboxInput
				className="bg-black/5 border border-black/5 rounded-2xl px-2 py-1 focus:outline-none text-sm w-1/2 focus:border-white/5 transition-all"
				displayValue={() => query}
				placeholder="Add an ingredient..."
				onChange={(event) => setQuery(event.target.value)}
			/>
			<ComboboxOptions
				anchor={{ to: 'bottom start', gap: '4px' }}
				className="border w-[var(--input-width)] empty:invisible bg-white/5 border-white/5 backdrop-blur-sm rounded-2xl"
			>
				{options.map((ingredient) => (
					<ComboboxOption
						key={ingredient.id}
						value={ingredient}
						className="p-2 text-sm data-focus:bg-black/5 "
					>
						{ingredient.name}
					</ComboboxOption>
				))}
			</ComboboxOptions>
		</Combobox>
	);
}
