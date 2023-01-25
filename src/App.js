import { VerticalTimeline, VerticalTimelineElement }  from 'react-vertical-timeline-component';

import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-vertical-timeline-component/style.min.css';
import { Code, Controller, Film, GlobeAmericas, HeadsetVr, Joystick, MegaphoneFill, PaletteFill, PenFill, PuzzleFill, Robot, Search } from 'react-bootstrap-icons';
import { QueryClient, QueryClientProvider, useQuery } from 'react-query';
import { useState } from 'react';
import DropdownItem from 'react-bootstrap/esm/DropdownItem';
import { DropdownButton } from 'react-bootstrap';

const typeToIcon = {
  'ar': () => <HeadsetVr />,
  'iot': () => <Robot />,
  'graphics': () => <PaletteFill />,
  'physics': () => <GlobeAmericas />,
  'software': () => <Code />,
  'exploration': () => <Search />,
  'games': () => <Controller />,
  'misc': () => <PuzzleFill />,
  'games': () => <Joystick />,
  'teaching': () => <MegaphoneFill />,
  'media': () => <Film />,
  'writing': () => <PenFill />,
};

const ElementFactory = ({ type, date, title, subtitle, description, url, imageUrl, }) => {
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
      {subtitle && <h4>{subtitle}</h4>}
      <div className="d-flex align-items-center">
        <div className='pe-4'>
          <img className='rounded' src={imageUrl} width={150} />
        </div>
        <div className="d-flex flex-column justify-content-between">
          <p className='m-0 pb-2'>{description}</p>
          <a target="_blank" href={url}>Read More</a>
        </div>
      </div>
    </VerticalTimelineElement>
  );
};

const TimelineFilter = ({ value, setValue }) => (
  <div className="d-flex justify-content-center pt-4">
    <DropdownButton title={value} className="dropdown-center">
      <DropdownItem onClick={() => setValue('Code')}>Code</DropdownItem>
      <DropdownItem onClick={() => setValue('Publications')}>Publications</DropdownItem>
      <DropdownItem onClick={() => setValue('Career')}>Career</DropdownItem>
      <DropdownItem onClick={() => setValue('Media')}>Media</DropdownItem>
    </DropdownButton>
  </div>
);

const Timelines = ({ filter, }) => {
  const { data: { events = [] } = {} } = useQuery(
    'timeline',
    () => fetch('timeline.json').then(res => res.json()),
    { refetchOnWindowFocus: false },
  );

  const elements = events.filter(({ category }) => category === filter.toLowerCase()).map((item, index) => (
    <ElementFactory
      key={index}
      {...item}
    />
  ));

  return (
    <div>
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
  const [value, setValue] = useState('Code');

  return (
    <div className="App">
      <QueryClientProvider client={queryClient}>
        <div className="fullscreen">
          <TimelineFilter value={value} setValue={setValue} />
          <Timelines filter={value} />
        </div>
      </QueryClientProvider>
    </div>
  );
}

export default App;
