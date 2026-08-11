import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LinkCard } from './LinkCard';

/**
 * Grade de links. Para curadores vira uma grade ordenável: o arraste atualiza a
 * ordem na hora e envia uma única requisição com a nova disposição.
 */
export function LinkGrid({ links, podeEditar, aoEditar, aoRemover, aoAlternarFavorito, aoReordenar }) {
  const sensores = useSensors(
    // Um pequeno deslocamento antes de arrastar preserva o clique no link.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Colunas fluidas: os cards ocupam a largura disponível em qualquer tela, em
  // vez de pararem em três colunas e deixarem sobra à direita nos monitores
  // largos.
  const grade =
    'grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr))]';

  if (!podeEditar || !aoReordenar) {
    return (
      <div className={grade}>
        {links.map((link, indice) => (
          <div
            key={link.id}
            className="animate-rise h-full"
            style={{ animationDelay: `${indice * 35}ms` }}
          >
            <LinkCard link={link} aoAlternarFavorito={aoAlternarFavorito} />
          </div>
        ))}
      </div>
    );
  }

  function aoSoltar({ active, over }) {
    if (!over || active.id === over.id) return;

    const anterior = links.findIndex((link) => link.id === active.id);
    const novo = links.findIndex((link) => link.id === over.id);
    const reordenados = arrayMove(links, anterior, novo);

    aoReordenar(reordenados.map((link, indice) => ({ id: link.id, order: indice + 1 })));
  }

  return (
    <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={aoSoltar}>
      <SortableContext items={links.map((link) => link.id)} strategy={rectSortingStrategy}>
        <div className={grade}>
          {links.map((link) => (
            <CardOrdenavel
              key={link.id}
              link={link}
              aoEditar={aoEditar}
              aoRemover={aoRemover}
              aoAlternarFavorito={aoAlternarFavorito}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function CardOrdenavel({ link, ...rest }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: link.id,
  });

  return (
    <LinkCard
      link={link}
      podeEditar
      arrastavel
      referencia={setNodeRef}
      atributosDeArraste={attributes}
      ouvintesDeArraste={listeners}
      estilo={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
        opacity: isDragging ? 0.85 : undefined,
      }}
      {...rest}
    />
  );
}
