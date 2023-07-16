import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';

function StravaEmbed({ id }) {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://strava-embeds.com/embed.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <>
      <Helmet>
        <script src="https://strava-embeds.com/embed.js" async />
      </Helmet>

      <div
        className="strava-embed-placeholder"
        data-embed-type="activity"
        data-embed-id={id}
      />
    </>
  );
}

export default StravaEmbed;
