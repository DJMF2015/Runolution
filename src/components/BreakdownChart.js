import React, { useEffect, useState } from 'react';
import { getAthleteStats } from '../utils/functions';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);
export const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
    },
    title: {
      display: true,
      text: 'Activities',
    },
  },
};

const BreakdownChart = () => {
  const athlete = JSON.parse(localStorage.getItem('athlete'));
  const access_token = JSON.parse(localStorage.getItem('access_token'));
  const [athleteStats, setAthleteStats] = useState([]);
  const [totalRides, setTotalRides] = useState(0); // Initial default value
  const [totalRuns, setTotalRuns] = useState(0); // Initial default value

  useEffect(() => {
    async function fetchData() {
      const athleteStats = await getAthleteStats(athlete?.id, access_token);
      if (athleteStats) {
        setAthleteStats(athleteStats);
        setTotalRides(athleteStats.data.all_ride_totals.count);
        setTotalRuns(athleteStats.data.all_run_totals.count);
      } else {
        setAthleteStats([]);
        setTotalRides(0);
        setTotalRuns(0);
      }
    }

    fetchData();
  }, [athlete?.id, access_token]);

  if (!athleteStats || !totalRides || !totalRuns) {
    return null;
  }

  const labelNames = ['Rides', 'Runs'];
  const data = {
    labels: labelNames,
    datasets: [
      {
        label: 'All Time Totals',
        data: [totalRides, totalRuns],
        backgroundColor: ['rgba(255, 99, 132, 0.2)', 'rgba(54, 162, 235, 0.2)'],
        borderColor: ['rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)'],
        borderWidth: 2,
      },
    ],
  };
  return (
    <div style={{ display: 'flex', justifyContent: 'end' }}>
      <div className="chart" style={{ width: '60vw', height: '280px' }}>
        <Doughnut width={75} height={50} data={data} />
      </div>
    </div>
  );
};

export default BreakdownChart;
