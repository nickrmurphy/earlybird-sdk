import { Ingredients } from './components/Ingredients';
import { RecipeDetails } from './components/RecipeDetails';
import { Recipes } from './components/Recipes';
import { useSelectedRecipe } from './hooks/useSelectedRecipe';

function App() {
	const [selectedRecipeId, setSelectedRecipeId] = useSelectedRecipe();

	return (
		<main className="grid grid-cols-3 h-full gap-4 p-4 bg-gray-50">
			<section className="col-span-1 flex flex-col gap-4">
				<Recipes />
				<Ingredients />
			</section>
			<RecipeDetails 
				selectedRecipeId={selectedRecipeId} 
				onRecipeDeleted={() => setSelectedRecipeId(null)} 
			/>
		</main>
	);
}

export default App;
