import { PlusIcon } from '@heroicons/react/24/solid';
import { useQuery, useStore } from './StoreProvider';

export function Ingredients() {
	const recipeStore = useStore('recipes');
	const ingredientStore = useStore('ingredients');
	const { data: ingredients } = useQuery('ingredients', {
		filter: (i) => !i.isDeleted,
	});

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
		<div className="bg-white/30 shadow rounded-lg p-3 h-full border border-white/10">
			<div className="flex items-center justify-between">
				<h2 className="font-bold p-3">Ingredients</h2>
				<button
					type="button"
					className="rounded-full active:scale-105 transition-all size-6 border border-white/10 flex items-center justify-center bg-white/10 shadow"
					onClick={handleAddIngredient}
				>
					<PlusIcon className="size-4 m-auto" />
				</button>
			</div>
			<ul>
				{ingredients?.map((ingredient) => (
					<>
						<li
							key={ingredient.id}
							className="p-2.5 rounded-lg hover:bg-black/5 transition-all flex items-center gap-2 w-full focus-within:ring focus-within:ring-white/10 outline-none "
						>
							<span className="rounded-full bg-black/10 size-6 text-sm p-0.5 flex items-center justify-center uppercase font-medium">
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
		</div>
	);
}
