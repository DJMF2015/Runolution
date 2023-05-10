import { Outlet, Link } from 'react-router-dom';
import LogoutButton from '../components/Logout';
import '../App.css';
const Layout = () => {
  return (
    <>
      <nav>
        <ul>
          <li>
            <Link to="/activities">Personal Activities</Link>
          </li>
          <li>
            <Link to="/map">HeatMap</Link>
          </li>

          <LogoutButton />
        </ul>
      </nav>

      <Outlet />
    </>
  );
};

export default Layout;
