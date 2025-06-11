import './App.css';
import { useQuery, useStore } from './components/StoreProvider';

function App() {
	const entryStore = useStore('entries');

	const { data: entries } = useQuery('entries', {
		sort: (a, b) => a.createdDate.localeCompare(b.createdDate),
	});

	const addEntry = async () => {
		const id = crypto.randomUUID();
		await entryStore.insert(id, {
			id,
			content: '',
			createdDate: new Date().toISOString(),
			isDeleted: false,
		});
	};

	const updateEntry = async (id: string, content: string) => {
		await entryStore.update(id, { content });
	};

	return (
		<main>
			<nav>
				<button type="button" onClick={addEntry}>
					Add Entry
				</button>
			</nav>
			<ul className="entries">
				{entries?.map((entry) => (
					<input
						key={entry.id}
						type="text"
						value={entry.content}
						onChange={(e) => updateEntry(entry.id, e.target.value)}
					/>
				))}
			</ul>
		</main>
	);
}

export default App;
