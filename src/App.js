import { VerticalTimeline, VerticalTimelineElement }  from 'react-vertical-timeline-component';

import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-vertical-timeline-component/style.min.css';
import { Code, Controller, GlobeAmericas, HeadsetVr, PaletteFill, PuzzleFill, Robot, Search } from 'react-bootstrap-icons';
import { QueryClient, QueryClientProvider, useQuery } from 'react-query';

const typeToIcon = {
  'ar': () => <HeadsetVr />,
  'iot': () => <Robot />,
  'graphics': () => <PaletteFill />,
  'physics': () => <GlobeAmericas />,
  'software': () => <Code />,
  'exploration': () => <Search />,
  'games': () => <Controller />,
  'misc': () => <PuzzleFill />
};

const ElementFactory = ({ type, date, title, description, url, imageUrl, }) => {
  return (
    <VerticalTimelineElement
      contentStyle={{ border: '1px solid #ccc', color: '#000', fontFamily: '"Antic Didone"', fontWeight: 500 }}
      contentArrowStyle={{ borderRight: '9px solid #ccc' }}
      dateClassName="date"
      iconStyle={{ background: '#daa520', color: '#fff' }}
      icon={typeToIcon[type]()}
      date={date}
    >
      <h3>{title}</h3>
      <div className="d-flex align-items-center">
        <div className='pe-4'>
          <img className='rounded' src={imageUrl} width={150} />
        </div>
        <div className="d-flex flex-column justify-content-between">
          <p className='m-0'>{description}</p>
          <a target="_blank" href={url}>Read More</a>
        </div>
      </div>
    </VerticalTimelineElement>
  );
};

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
