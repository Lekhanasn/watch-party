import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the watch party home page', () => {
  render(<App />);
  expect(screen.getByText(/Watch Party/i)).toBeInTheDocument();
  expect(screen.getByText(/shared playback/i)).toBeInTheDocument();
});
