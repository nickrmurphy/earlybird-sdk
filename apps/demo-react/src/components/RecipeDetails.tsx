import type { Ingredient } from '@byearlybird/demo-shared';
import { card } from './Card';
import { IngredientCombobox } from './IngredientCombobox';
import { useDocument, useStore } from './StoreProvider';

interface RecipeDetailsProps {
	selectedRecipeId: string | null;
	onRecipeDeleted: () => void;
}

export function RecipeDetails({
	selectedRecipeId,
	onRecipeDeleted,
}: RecipeDetailsProps) {
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
		<section className={card({ className: 'col-span-2' })}>
			{!selectedRecipeId && (
				<p className="m-auto font-medium">
					Select a recipe to view its details.
				</p>
			)}
			{selectedRecipeId && recipe && (
				<>
					<header className="w-full p-2">
						<input
							autoFocus={!isLoading && !recipe.title}
							value={recipe.title || ''}
							onChange={handleTitleChange}
							onBlur={() => {
								if (!recipe.title) {
									recipeStore.update(selectedRecipeId, { isDeleted: true });
									onRecipeDeleted();
								}
							}}
							type="text"
							placeholder="Untitled"
							className="text-xl font-bold focus:border-b transition-all w-full focus:outline-none box-border mb-px focus:mb-0"
						/>
					</header>
					<section className="flex flex-col gap-2">
						<div className="flex w-full gap-2 items-center justify-between">
							<h2 className="font-medium px-2">Ingredients</h2>
							<IngredientCombobox
								onSelect={handleIngredientSelect}
								exclude={recipe.ingredients.map((ingredient) => ingredient.id)}
							/>
						</div>
						<div className="rounded-lg flex flex-col gap-3 p-3">
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
	);
}
