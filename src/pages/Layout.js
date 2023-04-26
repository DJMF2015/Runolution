import { Outlet, Link } from 'react-router-dom';
// import '../index.css';
import '../App.css';
const Layout = () => {
  return (
    <>
      <nav>
        <ul>
          <li>
            <Link to="/">Profile</Link>
          </li>
          <li>
            <Link to="/activities">Personal Activities</Link>
          </li>
          <li>
            <Link to="/login">Login</Link>
          </li>
          <li>
            <Link to="/map">HeatMap</Link>
          </li>
          <li>
            <Link to="/statistics">Personal Stats</Link>
          </li>
          <li>
            <Link to="/club">Athlete Club</Link>
          </li>
          {/* <li>
            <Link to="/heatmap">Activity Heatmap</Link>
          </li> */}
        </ul>
      </nav>

      <Outlet />
    </>
  );
};

export default Layout;
