import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Carousel } from '../../src/components/Carousel/Carousel';

describe('carrusel de fotos', () => {
  it('describe cada foto con su posición, para quien no la ve', () => {
    render(<Carousel images={['i1', 'i2', 'i3']} label="Chirlito Suffle" />);

    expect(screen.getByAltText('Chirlito Suffle, foto 1 de 3')).toBeInTheDocument();
    expect(screen.getByAltText('Chirlito Suffle, foto 3 de 3')).toBeInTheDocument();
  });

  it('con una sola foto no muestra controles de navegación', () => {
    render(<Carousel images={['i1']} label="Grosso Crunch" />);

    expect(screen.queryByRole('button', { name: 'Foto siguiente' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ir a la foto/ })).not.toBeInTheDocument();
  });

  it('con varias fotos ofrece flechas y puntos, y marca la actual', () => {
    render(<Carousel images={['i1', 'i2']} label="Alfajor" />);

    expect(screen.getByRole('button', { name: 'Foto anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Foto siguiente' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Ir a la foto 1' })).toHaveAttribute('aria-current', 'true');
  });

  it('sin fotos no dibuja nada', () => {
    const { container } = render(<Carousel images={[]} label="Sin foto" />);
    expect(container).toBeEmptyDOMElement();
  });
});
