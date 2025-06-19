import type { Ingredient } from '@byearlybird/demo-shared';
import { IngredientCombobox } from './components/IngredientCombobox';
import { Ingredients } from './components/Ingredients';
import { Recipes } from './components/Recipes';
import { useDocument, useStore } from './components/StoreProvider';
import { useSelectedRecipe } from './hooks/useSelectedRecipe';

function App() {
	const [selectedRecipeId, setSelectedRecipeId] = useSelectedRecipe();
	const recipeStore = useStore('recipes');
	const { data: recipe, isLoading } = useDocument('recipes', selectedRecipeId);

	const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (!selectedRecipeId) return;
		recipeStore.update(selectedRecipeId, { title: event.target.value });
	};

	const handleIngredientSelect = (ingredient: Ingredient) => {
		if (!selectedRecipeId || !recipe) return;
		const ingredientSet = new Set(recipe.ingredients);
		ingredientSet.add(ingredient);
		recipeStore.update(selectedRecipeId, {
			ingredients: [...ingredientSet],
		});
	};

	return (
		<main className="grid grid-cols-3 bg-green-950 h-full gap-4 p-4">
			<section className="col-span-1 flex flex-col gap-4">
				<Recipes />
				<Ingredients />
			</section>
			<section className="flex flex-col gap-4 col-span-2 bg-white/30 shadow rounded-lg p-3 border border-white/10">
				{!selectedRecipeId && (
					<p className="text-white/80 m-auto font-medium">
						Select a recipe to view its details.
					</p>
				)}
				{selectedRecipeId && recipe && (
					<>
						<header className="w-full p-2">
							<input
								// biome-ignore lint/a11y/noAutofocus: <explanation>
								autoFocus={!isLoading && !recipe.title}
								value={recipe.title || ''}
								onChange={handleTitleChange}
								onBlur={() => {
									if (!recipe.title) {
										recipeStore.update(selectedRecipeId, { isDeleted: true });
										setSelectedRecipeId(null);
									}
								}}
								type="text"
								placeholder="Untitled"
								className="text-xl font-bold focus:border-b transition-all w-full border-white/10 focus:outline-none box-border mb-px focus:mb-0"
							/>
						</header>
						<section className="flex flex-col gap-2">
							<div className="flex w-full gap-2 items-center justify-between">
								<h2 className="font-medium px-2">Ingredients</h2>
								<IngredientCombobox
									onSelect={handleIngredientSelect}
									exclude={recipe.ingredients.map(
										(ingredient) => ingredient.id,
									)}
								/>
							</div>
							<div className="bg-black/5 border border-black/5 rounded-lg flex flex-col gap-3 p-3">
								{recipe.ingredients.map((ingredient) => (
									<div
										key={ingredient.id}
										className="flex items-center justify-between"
									>
										{ingredient.name}
									</div>
								))}
							</div>
						</section>
					</>
				)}
			</section>
		</main>
	);
}

export default App;
