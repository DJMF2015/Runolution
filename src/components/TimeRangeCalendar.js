import { ResponsiveTimeRange } from '@nivo/calendar';
import styled from 'styled-components';
import { useState, useEffect } from 'react';
import { formattedDate, getCurrentDate } from '../utils/conversion';

const TimeRangeCalendar = (props) => {
  const accessToken = localStorage.getItem('access_token');
  let formatted = getCurrentDate();
  const [activitiesCount, setActivityCounts] = useState(0);
  let date = formattedDate(formatted.currentDate.toISOString().split('T')[0]);

  // Get date 360 days ago from today
  const ThreeSixtyDaysAgo = new Date(
    formatted.currentYear,
    formatted.currentMonth,
    formatted.currentDay - 360
  );
  let formattedSixtyDaysAgo = ThreeSixtyDaysAgo.toISOString().split('T')[0];

  useEffect(() => {
    // Count activities on each date
    const countActivitiesByDate = () => {
      const activitiesCount = {};

      props?.props.forEach((activity) => {
        const date = activity?.start_date_local.slice(0, 10);
        activitiesCount[date] = (activitiesCount[date] || 0) + 1; // Increment the count for the date by 1 or initialize it to 1 if it doesn't exist
      });

      // Filter dates with one or more activities
      let multipleActivities = {};
      Object.keys(activitiesCount).forEach((date) => {
        if (activitiesCount[date] >= 1) {
          multipleActivities = activitiesCount;
        }
      });
      setActivityCounts(multipleActivities);
    };

    countActivitiesByDate();
  }, [props?.props]);

  return (
    accessToken && (
      <>
        <StyledCalendar>
          {' '}
          <h4 style={{ marginBottom: '-1rem', marginTop: '1rem', textAlign: 'center' }}>
            Activities
          </h4>
          <ResponsiveTimeRange
            data={Object.keys(activitiesCount).map((date) => ({
              day: date,
              value: activitiesCount[date],
            }))}
            from={formattedSixtyDaysAgo}
            to={date}
            minValue={Math.round(...Object.values(activitiesCount))}
            maxValue={Math.round(...Object.values(activitiesCount))}
            emptyColor="#eeeeee"
            colors={['#61cdbb', 'orange', '#e8c1a0', '#f47560']}
            margin={{ top: 40, right: 40, bottom: 10, left: 30 }}
            dayBorderWidth={2}
            dayBorderColor="#ffffff"
            legends={[
              {
                anchor: 'bottom-right',
                direction: 'row',
                justify: false,
                itemCount: 5,
                itemWidth: 50,
                itemHeight: 50,
                itemsSpacing: 12,
                itemDirection: 'right-to-left',
                translateX: -60,
                translateY: -150,
                symbolSize: 10,
              },
            ]}
          />
        </StyledCalendar>
      </>
    )
  );
};

export default TimeRangeCalendar;

const StyledCalendar = styled.div`
  height: 35vh;
  width: 50vw;
  margin-left: 25rem;
  margin-bottom: -5rem;
  box-shadow: 0px 0 5px #e6e6e6;

  @media screen and (max-width: 1000px) {
    margin-bottom: -11rem;
    margin-left: 20rem;
    border: 1px solid #e6e6e6;
    box-shadow: 0px 0 5px #e6e6e6;
  }

  @media screen and (max-width: 950px) {
    height: 35vh;
    width: 50vw;
    margin-bottom: -11rem;
    border: 1px solid #e6e6e6;
    box-shadow: 0px 0 5px #e6e6e6;
  }

  @media screen and (max-width: 850px) {
    display: none;
  }
`;
