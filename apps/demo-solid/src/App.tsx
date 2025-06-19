import { createSignal, For, Show, createEffect } from 'solid-js'
import './App.css'
import { StoreProvider, useStore } from './components/StoreProvider'
import { useSelectedRecipe } from './hooks/useSelectedRecipe'

function RecipeApp() {
  const recipeStore = useStore('recipes');
  const [recipes, setRecipes] = createSignal([]);
  const [selectedRecipeId, setSelectedRecipeId] = useSelectedRecipe();
  const [selectedRecipe, setSelectedRecipe] = createSignal(null);

  // Load recipes when component mounts
  const loadRecipes = async () => {
    const data = await recipeStore.all();
    if (data) {
      setRecipes(Object.values(data).filter(r => !r.isDeleted));
    }
  };

  // Load selected recipe when selection changes
  const loadSelectedRecipe = async () => {
    if (selectedRecipeId()) {
      const recipe = await recipeStore.get(selectedRecipeId());
      setSelectedRecipe(recipe);
    } else {
      setSelectedRecipe(null);
    }
  };

  // Initial load
  loadRecipes();

  // Watch for selection changes
  createEffect(() => {
    loadSelectedRecipe();
  });

  const handleAddRecipe = async () => {
    const id = crypto.randomUUID();
    await recipeStore.create(id, {
      id,
      title: '',
      description: '',
      isDeleted: false,
      ingredients: [],
    });
    setSelectedRecipeId(id);
    await loadRecipes();
  };

  const handleSelectRecipe = (recipeId: string) => {
    setSelectedRecipeId(recipeId);
  };

  const handleTitleChange = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (!selectedRecipeId()) return;
    
    await recipeStore.update(selectedRecipeId(), { title: target.value });
    await loadSelectedRecipe();
    await loadRecipes();
  };

  const handleDeleteRecipe = async () => {
    if (!selectedRecipeId()) return;
    
    await recipeStore.update(selectedRecipeId(), { isDeleted: true });
    setSelectedRecipeId(null);
    await loadRecipes();
  };

  const handleTitleBlur = async () => {
    if (!selectedRecipe()?.title && selectedRecipeId()) {
      await handleDeleteRecipe();
    }
  };

  return (
    <div style="display: flex; gap: 20px; padding: 20px; height: 100vh;">
      {/* Recipe List */}
      <div style="width: 300px; background: #f5f5f5; padding: 20px; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2>Recipes</h2>
          <button onClick={handleAddRecipe} style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Add Recipe
          </button>
        </div>
        <div>
          <For each={recipes()}>
            {(recipe) => (
              <div 
                onClick={() => handleSelectRecipe(recipe.id)}
                style={`padding: 12px; margin-bottom: 8px; border-radius: 4px; cursor: pointer; border: 2px solid ${selectedRecipeId() === recipe.id ? '#007bff' : 'transparent'}; background: ${selectedRecipeId() === recipe.id ? '#e7f3ff' : 'white'};`}
              >
                <div style="font-weight: bold;">{recipe.title || 'Untitled Recipe'}</div>
              </div>
            )}
          </For>
        </div>
      </div>

      {/* Recipe Details */}
      <div style="flex: 1; background: #f5f5f5; padding: 20px; border-radius: 8px;">
        <Show when={!selectedRecipeId()}>
          <p style="text-align: center; color: #666; margin-top: 100px;">
            Select a recipe to view its details.
          </p>
        </Show>
        
        <Show when={selectedRecipeId() && selectedRecipe()}>
          <div>
            <div style="margin-bottom: 20px;">
              <input
                type="text"
                value={selectedRecipe()?.title || ''}
                onInput={handleTitleChange}
                onBlur={handleTitleBlur}
                placeholder="Recipe Title"
                style="width: 100%; padding: 12px; font-size: 18px; font-weight: bold; border: 2px solid #ddd; border-radius: 4px; background: white;"
                autofocus={!selectedRecipe()?.title}
              />
            </div>
            
            <div style="display: flex; gap: 10px;">
              <button 
                onClick={handleDeleteRecipe}
                style="padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;"
              >
                Delete Recipe
              </button>
            </div>
            
            <div style="margin-top: 30px;">
              <h3>Ingredients</h3>
              <p style="color: #666;">Ingredients will be added in Phase 3</p>
            </div>
          </div>
        </Show>
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
