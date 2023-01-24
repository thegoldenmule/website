import { VerticalTimeline, VerticalTimelineElement }  from 'react-vertical-timeline-component';

import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-vertical-timeline-component/style.min.css';
import { Controller } from 'react-bootstrap-icons';
import { QueryClient, QueryClientProvider, useQuery } from 'react-query';

const ElementFactory = ({ type, date, title, description, imageUrl, }) => {
  return (
    <VerticalTimelineElement
      contentStyle={{ background: 'rgb(33, 150, 243)', color: '#fff' }}
      contentArrowStyle={{ borderRight: '7px solid  rgb(33, 150, 243)' }}
      iconStyle={{ background: 'rgb(33, 150, 243)', color: '#fff' }}
      icon={<Controller />}
      date={date}
    >
      <h3>{title}</h3>
      <p>{description}</p>
      <img src={imageUrl} />
    </VerticalTimelineElement>
  )
}

const Timelines = () => {
  const { data: { events = [] } = {} } = useQuery(
    'timeline',
    () => fetch('timeline.json').then(res => res.json()),
    { refetchOnWindowFocus: false },
  );

  const elements = events.map((item, index) => (
    <ElementFactory
      key={index}
      {...item}
    />
  ));

  return (
    <div className="fullscreen">
      { events.length > 0 && (
        <VerticalTimeline
          lineColor="#daa520">
          {elements}
        </VerticalTimeline>
      ) }
    </div>
  );
};

const queryClient = new QueryClient();

function App() {
  return (
    <div className="App">
      <QueryClientProvider client={queryClient}>
        <Timelines />
      </QueryClientProvider>
    </div>
  );
}

export default App;
