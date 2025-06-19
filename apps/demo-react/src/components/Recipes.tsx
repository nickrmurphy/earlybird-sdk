import { PlusIcon } from '@heroicons/react/24/solid';
import { cx } from 'cva';
import { useSelectedRecipe } from '../hooks/useSelectedRecipe';
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
		<div className="bg-white/30 p-2 shadow rounded-lg h-full border border-white/10">
			<div className="flex items-center justify-between">
				<h2 className="font-bold p-3">Recipes</h2>
				<button
					type="button"
					className="rounded-full active:scale-105 transition-all size-6 border border-white/10 flex items-center justify-center bg-white/10 shadow"
					onClick={handleCreateRecipe}
				>
					<PlusIcon className="size-4 m-auto" />
				</button>
			</div>
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
							<span className="rounded-full bg-black/10 size-6 text-sm p-0.5 flex items-center justify-center uppercase font-medium">
								{recipe.title.slice(0, 1)}
							</span>
							<span>{recipe.title}</span>
						</li>
					</>
				))}
			</ul>
		</div>
	);
}
