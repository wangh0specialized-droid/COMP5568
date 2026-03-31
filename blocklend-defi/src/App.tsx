import { Web3Provider } from './hooks/useWeb3';
import Dashboard from './components/Dashboard';

export default function App() {
  return (
    <Web3Provider>
      <Dashboard />
    </Web3Provider>
  );
}
