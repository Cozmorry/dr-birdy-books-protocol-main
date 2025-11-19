import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Dr. Birdy Books Protocol', () => {
  render(<App />);
  const headingElement = screen.getByRole('heading', { name: /Dr. Birdy Books Protocol/i });
  expect(headingElement).toBeInTheDocument();
});
