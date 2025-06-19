import { createSignal, For } from 'solid-js'
import './App.css'
import { StoreProvider, useStore } from './components/StoreProvider'

function RecipeApp() {
  const recipeStore = useStore('recipes');
  const [recipes, setRecipes] = createSignal([]);

  // Load recipes when component mounts
  recipeStore.all().then(data => {
    if (data) {
      setRecipes(Object.values(data).filter(r => !r.isDeleted));
    }
  });

  const handleAddRecipe = async () => {
    const id = crypto.randomUUID();
    await recipeStore.create(id, {
      id,
      title: `Recipe ${recipes().length + 1}`,
      description: '',
      isDeleted: false,
      ingredients: [],
    });
    
    // Refresh the recipes list
    const data = await recipeStore.all();
    if (data) {
      setRecipes(Object.values(data).filter(r => !r.isDeleted));
    }
  };

  return (
    <div>
      <h1>Demo Solid - Recipes</h1>
      <button onClick={handleAddRecipe}>
        Add Recipe
      </button>
      <div>
        <h2>Recipes:</h2>
        <For each={recipes()}>
          {(recipe) => (
            <div>{recipe.title}</div>
          )}
        </For>
      </div>
    </div>
  )
}

function App() {
  return (
    <StoreProvider>
      <RecipeApp />
    </StoreProvider>
  )
}

export default App
