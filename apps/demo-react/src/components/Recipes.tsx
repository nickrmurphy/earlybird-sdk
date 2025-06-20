import { cx } from 'cva';
import { useSelectedRecipe } from '../hooks/useSelectedRecipe';
import { Card } from './Card';
import { useQuery, useStore } from './StoreProvider';

export function Recipes() {
	const recipeStore = useStore('recipes');
	const { data: recipes } = useQuery('recipes', (data) =>
		Object.values(data).filter((r) => !r.isDeleted),
	);
	const [selectedRecipe, setSelectedRecipe] = useSelectedRecipe();

	const handleCreateRecipe = async () => {
		const id = crypto.randomUUID();
		await recipeStore.create(id, {
			id,
			title: '',
			isDeleted: false,
			ingredients: [],
		});
		setSelectedRecipe(id);
	};

	return (
		<Card title="Recipes" onAddClick={handleCreateRecipe}>
			<ul>
				{recipes?.map((recipe) => (
					<>
						{/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
						<li
							key={recipe.id}
							onClick={() => {
								setSelectedRecipe(recipe.id);
							}}
							className={cx(
								'p-2.5 active:scale-101 rounded-lg transition-all flex items-center gap-2 w-full',
								selectedRecipe === recipe.id
									? 'bg-white/10 border border-white/10 hover:bg-white/5'
									: 'hover:bg-black/5',
							)}
						>
							<span className="rounded-full size-6 text-sm p-0.5 flex items-center justify-center uppercase font-medium border border-gray-200">
								{recipe.title.slice(0, 1)}
							</span>
							<span>{recipe.title}</span>
						</li>
					</>
				))}
			</ul>
		</Card>
	);
}
