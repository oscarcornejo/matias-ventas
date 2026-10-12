import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Reorderable } from '../../src/components/Reorderable/Reorderable';

const ITEMS = [
  { id: 'a', name: 'Chirlito' },
  { id: 'b', name: 'Grosso' },
  { id: 'c', name: 'Alfajor' },
];

function render3(onReorder = vi.fn()) {
  render(
    <Reorderable items={ITEMS} onReorder={onReorder}>
      {(item) => <span>{item.name}</span>}
    </Reorderable>,
  );
  return onReorder;
}

describe('lista reordenable', () => {
  it('se puede reordenar sin arrastrar, solo con botones', async () => {
    // Arrastrar no funciona con teclado ni con lector de pantalla: si el orden
    // dependiera solo del arrastre, quedaría fuera del alcance de quien no puede.
    const user = userEvent.setup();
    const onReorder = render3();

    await user.click(screen.getByRole('button', { name: /Bajar, posición 1 de 3/ }));

    expect(onReorder).toHaveBeenCalledWith(['b', 'a', 'c']);
  });

  it('manda la lista completa de ids, no índices: no se pierde la referencia', async () => {
    const user = userEvent.setup();
    const onReorder = render3();

    await user.click(screen.getByRole('button', { name: /Subir, posición 3 de 3/ }));

    expect(onReorder).toHaveBeenCalledWith(['a', 'c', 'b']);
  });

  it('no deja subir el primero ni bajar el último', () => {
    render3();
    expect(screen.getByRole('button', { name: /Subir, posición 1 de 3/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Bajar, posición 3 de 3/ })).toBeDisabled();
  });

  it('se puede recorrer con teclado, saltando los controles deshabilitados', async () => {
    const user = userEvent.setup();
    render3();
    // "Subir" de la primera fila está deshabilitado: el foco cae en "Bajar".
    await user.tab();
    expect(screen.getByRole('button', { name: /Bajar, posición 1 de 3/ })).toHaveFocus();
  });
});
