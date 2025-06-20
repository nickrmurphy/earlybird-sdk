import { PlusIcon } from '@heroicons/react/24/solid';
import { cva } from 'cva';
import type { ReactNode } from 'react';

interface CardProps {
	title: string;
	onAddClick?: () => void;
	children: ReactNode;
	className?: string;
}

export const card = cva({
	base: 'p-2 bg-gray-100 border border-gray-200 rounded-lg h-full',
});

export const cardHeader = cva({
	base: 'flex items-center justify-between',
});

export const cardTitle = cva({
	base: 'font-bold p-3',
});

export const cardButton = cva({
	base: 'rounded-full transition-all size-8 flex items-center justify-center bg-gray-50 border border-gray-200',
});

export function Card({ title, onAddClick, children, className }: CardProps) {
	return (
		<div className={card({ className })}>
			<div className={cardHeader()}>
				<h2 className={cardTitle()}>{title}</h2>
				{onAddClick && (
					<button type="button" className={cardButton()} onClick={onAddClick}>
						<PlusIcon className="size-4" />
					</button>
				)}
			</div>
			{children}
		</div>
	);
}
