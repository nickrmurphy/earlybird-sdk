import { createSignal, Index, onMount } from 'solid-js';
import { Card } from './Card';
import { useStore } from './StoreProvider';

export function Ingredients() {
	const ingredientStore = useStore('ingredients');
	const recipeStore = useStore('recipes');
	const [ingredients, setIngredients] = createSignal([]);

	const loadIngredients = async () => {
		const data = await ingredientStore.all();
		if (data) {
			setIngredients(Object.values(data).filter(i => !i.isDeleted));
		}
	};

	// Load ingredients on mount
	onMount(() => {
		loadIngredients();
	});

	const handleAddIngredient = async () => {
		const id = crypto.randomUUID();
		await ingredientStore.create(id, {
			id,
			name: '',
			isDeleted: false,
		});
		await loadIngredients();
	};

	const handleUpdateIngredient = async (id: string, name: string) => {
		await ingredientStore.update(id, { name });
		
		// Update ingredient names in all recipes that use this ingredient
		const allRecipes = await recipeStore.all();
		if (!allRecipes) return;

		const recipesToUpdate = Object.values(allRecipes).filter((r) =>
			r.ingredients.some((i) => i.id === id),
		);

		const updatePromises = recipesToUpdate.map((recipe) =>
			recipeStore.update(recipe.id, {
				ingredients: recipe.ingredients.map((i) =>
					i.id === id ? { ...i, name } : i,
				),
			})
		);

		await Promise.all(updatePromises);
		await loadIngredients();
	};

	const handleIngredientBlur = async (id: string, name: string) => {
		if (name.trim() === '') {
			await ingredientStore.update(id, { isDeleted: true });
			await loadIngredients();
		}
	};

	return (
		<Card title="All Ingredients" onAddClick={handleAddIngredient}>
			<ul class="space-y-2">
				<Index each={ingredients()}>
					{(ingredient, i) => (
						<li class="p-2.5 rounded-lg hover:bg-black/5 transition-all flex items-center gap-2 w-full focus-within:ring focus-within:ring-white/10 outline-none">
							<span class="rounded-full bg-black/10 size-6 text-sm p-0.5 flex items-center justify-center uppercase font-medium text-white">
								{ingredient().name.slice(0, 1)}
							</span>
							<input
								class="w-full focus:outline-none bg-transparent text-white placeholder-white/50"
								value={ingredient().name}
								onInput={(e) => handleUpdateIngredient(ingredient().id, e.target.value)}
								onBlur={(e) => handleIngredientBlur(ingredient().id, e.target.value)}
								placeholder="Ingredient name"
								autofocus={ingredient().name === ''}
							/>
						</li>
					)}
				</Index>
				{ingredients().length === 0 && (
					<p class="text-white/60 text-center mt-10 text-sm">
						No ingredients yet. Click + to add some!
					</p>
				)}
			</ul>
		</Card>
	);
}