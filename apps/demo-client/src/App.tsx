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

	return (
		<main className="grid grid-cols-3 bg-green-950 h-full gap-4 p-4">
			<section className="col-span-1 flex flex-col gap-4">
				<Recipes />
				<Ingredients />
			</section>
			<section className="flex col-span-2 bg-white/30 shadow rounded-lg p-3 border border-white/10">
				{!selectedRecipeId && (
					<p className="text-white/80 m-auto font-medium">
						Select a recipe to view its details.
					</p>
				)}
				{selectedRecipeId && recipe && (
					<header className="w-full">
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
							className="p-2 text-xl font-bold focus:border-b transition-all w-full border-white/10 focus:outline-none box-border"
						/>
					</header>
				)}
			</section>
		</main>
	);
}

export default App;
