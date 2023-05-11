import { Outlet, Link } from 'react-router-dom';
// import LogoutButton from '../components/Logout';
import '../styles/Nav.module.css';
const Layout = () => {
  return (
    <>
      <nav>
        <ul>
          <li>
            <Link to="/">Personal Activities</Link>
          </li>
          <li>
            <Link to="/map">HeatMap</Link>
          </li>
        </ul>
      </nav>
      <Outlet />
    </>
  );
};

export default Layout;
