import { createSignal, For, onMount, createEffect } from 'solid-js';
import { useStore } from './StoreProvider';
import type { Ingredient } from '@byearlybird/demo-shared';

interface IngredientComboboxProps {
	onSelect: (ingredient: Ingredient) => void;
	exclude?: string[];
}

export function IngredientCombobox(props: IngredientComboboxProps) {
	const ingredientStore = useStore('ingredients');
	const [allIngredients, setAllIngredients] = createSignal<Ingredient[]>([]);
	const [availableIngredients, setAvailableIngredients] = createSignal<Ingredient[]>([]);
	const [selectedId, setSelectedId] = createSignal('');

	const loadAllIngredients = async () => {
		const data = await ingredientStore.all();
		if (data) {
			const ingredients = Object.values(data).filter(i => !i.isDeleted);
			setAllIngredients(ingredients);
		}
	};

	// Filter available ingredients when exclude list changes
	createEffect(() => {
		const available = allIngredients().filter(i => 
			!props.exclude?.includes(i.id)
		);
		setAvailableIngredients(available);
		
		// Reset selection if current selection is now excluded
		if (selectedId() && props.exclude?.includes(selectedId())) {
			setSelectedId('');
		}
	});

	onMount(() => {
		loadAllIngredients();
	});

	const handleSelect = () => {
		const ingredient = availableIngredients().find(i => i.id === selectedId());
		if (ingredient) {
			props.onSelect(ingredient);
			setSelectedId(''); // Reset selection
		}
	};

	return (
		<div class="flex gap-2 items-center">
			<select
				class="bg-black/5 border border-black/5 rounded-2xl px-2 py-1 focus:outline-none text-sm focus:border-white/5 transition-all"
				value={selectedId()}
				onInput={(e) => setSelectedId(e.target.value)}
			>
				<option value="" disabled>Add an ingredient...</option>
				<For each={availableIngredients()}>
					{(ingredient) => (
						<option value={ingredient.id}>{ingredient.name}</option>
					)}
				</For>
			</select>
			<button
				onClick={handleSelect}
				disabled={!selectedId() || availableIngredients().length === 0}
				class="px-2 py-1 bg-blue-600 text-white rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
			>
				Add
			</button>
		</div>
	);
}