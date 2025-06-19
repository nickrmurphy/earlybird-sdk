import { createSignal, For, Show, createEffect } from 'solid-js'
import './App.css'
import { StoreProvider, useStore } from './components/StoreProvider'
import { useSelectedRecipe } from './hooks/useSelectedRecipe'
import { Ingredients } from './components/Ingredients'

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
    <main class="grid grid-cols-3 bg-green-950 h-full gap-4 p-4">
      {/* Sidebar */}
      <section class="col-span-1 flex flex-col gap-4">
        {/* Recipe List */}
        <div class="bg-white/30 shadow rounded-lg p-3 border border-white/10">
          <div class="flex items-center justify-between mb-5">
            <h2 class="font-bold text-white">Recipes</h2>
            <button 
              onClick={handleAddRecipe} 
              class="rounded-full active:scale-105 transition-all size-6 border border-white/10 flex items-center justify-center bg-white/10 shadow"
            >
              <span class="text-white text-sm">+</span>
            </button>
          </div>
          <ul class="space-y-2">
            <For each={recipes()}>
              {(recipe) => (
                <li
                  onClick={() => handleSelectRecipe(recipe.id)}
                  class={`p-2.5 active:scale-101 rounded-lg transition-all flex items-center gap-2 w-full cursor-pointer ${
                    selectedRecipeId() === recipe.id
                      ? 'bg-white/10 border border-white/10 hover:bg-white/5'
                      : 'hover:bg-black/5'
                  }`}
                >
                  <span class="rounded-full bg-black/10 size-6 text-sm p-0.5 flex items-center justify-center uppercase font-medium text-white">
                    {recipe.title?.slice(0, 1) || 'U'}
                  </span>
                  <span class="text-white">{recipe.title || 'Untitled Recipe'}</span>
                </li>
              )}
            </For>
          </ul>
        </div>

        {/* Ingredients List */}
        <Ingredients />
      </section>

      {/* Recipe Details */}
      <section class="flex flex-col gap-4 col-span-2 bg-white/30 shadow rounded-lg p-3 border border-white/10">
        <Show when={!selectedRecipeId()}>
          <p class="text-white/80 m-auto font-medium">
            Select a recipe to view its details.
          </p>
        </Show>
        
        <Show when={selectedRecipeId() && selectedRecipe()}>
          <div class="h-full flex flex-col">
            <header class="w-full p-2">
              <input
                type="text"
                value={selectedRecipe()?.title || ''}
                onInput={handleTitleChange}
                onBlur={handleTitleBlur}
                placeholder="Untitled"
                class="text-xl font-bold focus:border-b transition-all w-full border-white/10 focus:outline-none box-border mb-px focus:mb-0 bg-transparent text-white placeholder-white/50"
                autofocus={!selectedRecipe()?.title}
              />
            </header>
            
            <section class="flex flex-col gap-2 flex-1">
              <div class="flex w-full gap-2 items-center justify-between">
                <h2 class="font-medium px-2 text-white">Recipe Ingredients</h2>
                <button 
                  class="rounded-full text-xs px-3 py-1 bg-blue-600 text-white border border-white/10 opacity-50 cursor-not-allowed"
                  disabled
                >
                  + Add (Phase 5)
                </button>
              </div>
              <div class="bg-black/5 border border-black/5 rounded-lg flex flex-col gap-3 p-3 flex-1">
                <For each={selectedRecipe()?.ingredients || []}>
                  {(ingredient) => (
                    <div class="flex items-center justify-between text-white">
                      <div class="flex items-center gap-2">
                        <span class="rounded-full bg-blue-600 size-6 text-sm flex items-center justify-center text-white font-bold">
                          {ingredient.name.charAt(0).toUpperCase()}
                        </span>
                        {ingredient.name}
                      </div>
                    </div>
                  )}
                </For>
                {(!selectedRecipe()?.ingredients || selectedRecipe()?.ingredients.length === 0) && (
                  <p class="text-white/60 text-center mt-10">
                    No ingredients added yet.
                  </p>
                )}
              </div>
            </section>
            
            <div class="pt-4 border-t border-white/10">
              <button 
                onClick={handleDeleteRecipe}
                class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete Recipe
              </button>
            </div>
          </div>
        </Show>
      </section>
    </main>
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
