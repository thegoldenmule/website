import { VerticalTimeline, VerticalTimelineElement }  from 'react-vertical-timeline-component';

import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-vertical-timeline-component/style.min.css';

import { Code, Controller, Film, GlobeAmericas, HeadsetVr, Joystick, MegaphoneFill, PaletteFill, PenFill, PuzzleFill, Robot, Search } from 'react-bootstrap-icons';
import { QueryClient, QueryClientProvider, useQuery } from 'react-query';
import { useState } from 'react';
import DropdownItem from 'react-bootstrap/esm/DropdownItem';
import { Col, Container, DropdownButton, Nav, Navbar, Row } from 'react-bootstrap';

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

const contentStyleFor = ({ type, category }) => {
  if (category === 'career') {
    return { outline: '2px solid #daa520', borderLeft: '20px solid #daa520', color: '#000', fontFamily: '"Antic Didone"', fontWeight: 500 };
  }

  if (category === 'publications') {
    return { border: '2px dashed #ccc', color: '#000', fontFamily: '"Antic Didone"', fontWeight: 500 };
  }

  if (category === 'contributions') {
    return { border: '4px double #ccc', color: '#000', fontFamily: '"Antic Didone"', fontWeight: 500 };
  }

  if (category === 'products') {
    return { outline: '1px solid #ccc', borderBottom: '20px solid #daa520', borderRadius:'16px 14px 8px 40px', color: '#000', fontFamily: '"Antic Didone"', fontWeight: 500 };
  }

  return { outline: '1px solid #ccc', color: '#000', fontFamily: '"Antic Didone"', fontWeight: 500 };
};

const ElementFactory = ({ category, type, date, title, subtitle, description, url, imageUrl, }) => {
  return (
    <VerticalTimelineElement
      className={`type-${type} category-${category}`}
      contentStyle={contentStyleFor({ type, category })}
      contentArrowStyle={{ borderRight: '9px solid #daa520' }}
      dateClassName="date"
      iconStyle={{ background: '#daa520', color: '#fff' }}
      icon={typeToIcon[type]()}
      date={date}
    >
      <div className="d-flex flex-column pb-4">
        <h3>{title}</h3>
        {subtitle && <h5>{subtitle}</h5>}
      </div>
      <div className="d-flex align-items-center">
        { imageUrl && (
          <div className='pe-4'>
            <img className='rounded' src={imageUrl} width={150} />
          </div>
        )}
        <div className="d-flex flex-column justify-content-between">
          <p className='m-0 pb-2'>{description}</p>
          { url && <a target="_blank" href={url}>Read More</a> }
        </div>
      </div>
    </VerticalTimelineElement>
  );
};

const TimelineFilter = ({ value, setValue }) => (
  <div className="d-flex justify-content-center pt-4">
    <DropdownButton title={value} className="dropdown-center">
    <DropdownItem onClick={() => setValue('All')}>All</DropdownItem>
      <DropdownItem onClick={() => setValue('Code')}>Code</DropdownItem>
      <DropdownItem onClick={() => setValue('Publications')}>Publications</DropdownItem>
      <DropdownItem onClick={() => setValue('Career')}>Career</DropdownItem>
      <DropdownItem onClick={() => setValue('Products')}>Products</DropdownItem>
      <DropdownItem onClick={() => setValue('Contributions')}>Contributions</DropdownItem>
    </DropdownButton>
  </div>
);

const Timelines = ({ filter, }) => {
  const { data: { events = [] } = {} } = useQuery(
    'timeline',
    () => fetch('timeline.json').then(res => res.json()),
    { refetchOnWindowFocus: false },
  );

  const elements = events.filter(({ category }) => filter === "All" || category === filter.toLowerCase()).map((item, index) => (
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
  const [value, setValue] = useState('All');

  const buttons = ['All', 'Code', 'Publications', 'Career', 'Products', 'Contributions'].map((category, i) => (
    <h4
      key={i}
      className="header-link"
      style={value === category ? { color: '#000' } : { color: '#ccc' }}
      onClick={() => setValue(category)}
    >
      {category}
    </h4>
  ));

  return (
    <div className="App">
      <QueryClientProvider client={queryClient}>
        <Container>
          <Row>
            <Col className="d-flex ">
              <img className="m-auto" src="https://thegoldenmule.com/logo.png" width={150} />
            </Col>
          </Row>
          <Row>
            <Col className="d-flex">
              <div className="m-auto d-flex">
                {buttons}
              </div>
            </Col>
          </Row>
          <Timelines filter={value} />
        </Container>
      </QueryClientProvider>
    </div>
  );
}

export default App;
