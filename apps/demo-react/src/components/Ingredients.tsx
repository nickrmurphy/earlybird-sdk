import { Card } from './Card';
import { useQuery, useStore } from './StoreProvider';

export function Ingredients() {
	const recipeStore = useStore('recipes');
	const ingredientStore = useStore('ingredients');
	const { data: ingredients } = useQuery('ingredients', (data) =>
		Object.values(data).filter((i) => !i.isDeleted),
	);

	const handleAddIngredient = async () => {
		const id = crypto.randomUUID();

		await ingredientStore.create(id, {
			id,
			name: '',
			isDeleted: false,
		});
	};

	const handleUpdateIngredient = async (id: string, name: string) => {
		await ingredientStore.update(id, { name });
		const allRecipes = await recipeStore.all();
		if (!allRecipes) return;

		const toUpdate = Object.values(allRecipes).filter((r) =>
			r.ingredients.some((i) => i.id === id),
		);

		await recipeStore.updateMany(
			toUpdate.map((recipe) => ({
				id: recipe.id,
				value: {
					ingredients: recipe.ingredients.map((i) =>
						i.id === id ? { ...i, name } : i,
					),
				},
			})),
		);
	};

	return (
		<Card title="Ingredients" onAddClick={handleAddIngredient}>
			<ul>
				{ingredients?.map((ingredient) => (
					<>
						<li
							key={ingredient.id}
							className="p-2.5 rounded-lg hover:ring-2 hover:ring-amber-200 hover:bg-amber-200/10 transition-all flex items-center gap-2 w-full focus-within:ring focus-within:ring-white/10 outline-none "
						>
							<span className="rounded-full size-6 text-sm flex items-center justify-center uppercase font-medium border border-gray-200 flex-shrink-0">
								{ingredient.name.slice(0, 1)}
							</span>
							<input
								// biome-ignore lint/a11y/noAutofocus: <TODO: find a more accesible way to do this>
								autoFocus={ingredient.name === ''}
								onBlur={() => {
									if (ingredient.name === '') {
										ingredientStore.update(ingredient.id, { isDeleted: true });
									}
								}}
								className="w-full focus:outline-none"
								value={ingredient.name}
								onChange={(e) =>
									handleUpdateIngredient(ingredient.id, e.target.value)
								}
							/>
						</li>
					</>
				))}
			</ul>
		</Card>
	);
}
