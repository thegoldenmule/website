import { VerticalTimeline, VerticalTimelineElement }  from 'react-vertical-timeline-component';

import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-vertical-timeline-component/style.min.css';

import { Code, Controller, Film, GlobeAmericas, HeadsetVr, Joystick, MegaphoneFill, PaletteFill, PencilFill, PenFill, PuzzleFill, Robot, Search } from 'react-bootstrap-icons';
import { QueryClient, QueryClientProvider, useQuery } from 'react-query';
import { useState } from 'react';
import { Col, Container, OverlayTrigger, Row, Tooltip } from 'react-bootstrap';

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
            <img className='d-lg-none rounded' src={imageUrl} width={75} />
            <img className='d-lg-block d-none rounded' src={imageUrl} width={150} />
          </div>
        )}
        <div className="d-flex flex-column justify-content-between">
          <p className='m-0 pb-2'>{description}</p>
          { url && <a className="fw-bold" target="_blank" href={url}>Read More</a> }
        </div>
      </div>
    </VerticalTimelineElement>
  );
};

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

const ExternalLinks = () => (
  <Col className="d-flex mb-4">
    <div className="m-auto">
      <a className="px-2" target="_blank" href="https://thegoldenmule.medium.com/">
        <img width={32} src="https://thegoldenmule.com/thumbnails/medium-logo.svg" />
      </a>
      <a className="px-2" target="_blank" href="https://github.com/thegoldenmule">
        <img width={32} src="https://thegoldenmule.com/thumbnails/github-mark.svg" />
      </a>
      <a className="px-2" target="_blank" href="https://www.linkedin.com/in/benjaminmicahj/">
        <img width={32} src="https://thegoldenmule.com/thumbnails/linkedin-logo.png" />
      </a>
      <a className="px-2" target="_blank" href="https://www.goodreads.com/user/show/106890887-benjamin-jordan">
        <img width={32} src="https://thegoldenmule.com/thumbnails/goodreads-logo.png" />
      </a>
      <a className="px-2" target="_blank" href="https://thegoldenmule.com/blog">
        <img width={32} src="https://thegoldenmule.com/thumbnails/wordpress-logo.png" />
      </a>
      <a className="px-2" target="_blank" href="https://thegoldenmule.svbtle.com/">
        <PencilFill />
      </a>
    </div>
  </Col>
);

const renderTechTooltip = (props) => (
  <Tooltip id="button-tooltip" {...props}>
    <div className="text-start">
      <ul>
        <li>Langs: C#, C, C++, Objective C, Java, Python, JavaScript (ES6+), Go</li>
        <li>Graphics: CG, GLSL, AGAL</li>
        <li>Build: Make, Gradle, Maven, Ant, Jenkins</li>
        <li>Game: Unity, THREE.js, Cinder, Processing, Cocos2d, Flash</li>
        <li>Server: Akka.NET, DotNetty, WebAPI, Nakama, Express.js, Sails.js, Socket.io</li>
        <li>Data: AWS Kinesis, Snowflake, Tableau</li>
        <li>Cloud: AWS, GCP, Azure, Docker</li>
        <li>Crypto: Solidity, IPFS, Polygon Edge, Remix, Hardhat</li>
      </ul>
    </div>
  </Tooltip>
)

const queryClient = new QueryClient();

function App() {
  const [value, setValue] = useState('All');
  const [showHelp, setShowHelp] = useState(false);

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
      <p
        className="github-fork-ribbon"
        data-ribbon={showHelp ? "Back to portfolio" : "Looking for my help?"}
        style={{ cursor: 'pointer', userSelect: 'none', }}
        onClick={() => setShowHelp(!showHelp)}
      />

      <QueryClientProvider client={queryClient}>
        <Container>
          <Row className="pt-4">
            <Col className="d-flex">
            <img
              className="mx-auto" src="https://thegoldenmule.com/thumbnails/logo_square.png"
              width={150} height={150}
              style={{ cursor: 'pointer', userSelect: 'none', }}
              onClick={() => setShowHelp(false)}
            />
            </Col>
          </Row>
          <Row>
            <ExternalLinks />
          </Row>
          <Row className="py-4">
            <Col className="d-flex pt-4">
              <img className="d-block d-md-none m-auto" style={{ width: '100%' }} src="https://thegoldenmule.com/thumbnails/card.jpg" />
              <img className="d-none d-md-block m-auto" style={{ width: '400px' }} src="https://thegoldenmule.com/thumbnails/card.jpg" />
            </Col>
          </Row>

          {
            showHelp && (
              <Row>
                <div>
                  <p><span className="lead fw-bold">TLDR</span>&nbsp;I have <i>extensive</i> tech and team skillsets, and have helped a variety of companies and individuals achieve their goals.</p>
                </div>
                <div>
                  <p>This is the tech I know:</p>
                  <ul>
                    <li><span className="fw-bold">Language</span>: C#, C, C++, Objective C, Java, Python, JavaScript (ES6+), Go</li>
                    <li><span className="fw-bold">Graphics</span>: CG, GLSL, AGAL</li>
                    <li><span className="fw-bold">Build</span>: Make, Gradle, Maven, Ant, Jenkins</li>
                    <li><span className="fw-bold">Game</span>: Unity, THREE.js, Cinder, Processing, Cocos2d, Flash</li>
                    <li><span className="fw-bold">Web</span>: React, Redux, Bootstrap, ReactRouter, Web Crypto, Socket.io</li>
                    <li><span className="fw-bold">Server</span>: Akka.NET, DotNetty, WebAPI, Nakama, Express.js, Sails.js, Socket.io</li>
                    <li><span className="fw-bold">Data</span>: AWS Kinesis, Snowflake, Tableau</li>
                    <li><span className="fw-bold">Cloud</span>: AWS, GCP, Azure, Docker</li>
                    <li><span className="fw-bold">Crypto</span>: Solidity, IPFS, Polygon Edge</li>
                  </ul>
                </div>
                <div>
                  <p>These are the types of engagements I'm available for:</p>
                </div>
                <div className="d-flex flex-column px-4 pb-4">
                  <p className="lead fst-italic">Fractional (Part-Time) CTO</p>
                  <p>A full-time CTO only makes sense with scale. For seed or pre-seed stage startups I offer technical vision, process, and hiring help.</p>

                  <p className="lead fst-italic">Advisor</p>
                  <p>For companies or individuals looking for regular direction and insight through the full product and company development lifecycle, I am available on a regular cadence.</p>

                  <p className="lead fst-italic">Consulting</p>
                  <p>Do you have a targeted problem you're trying to solve? A simple call might suffice to unblock a team, or focused deliverable for larger projects.</p>
                </div>
              </Row>
            )
          }

          { !showHelp && (
            <>
              <Row>
                <Col className="d-flex m-auto">
                  <div className="m-auto d-none d-md-flex">
                    {buttons}
                  </div>
                  <div className="m-auto d-block d-md-none">
                    {buttons}
                  </div>
                </Col>
              </Row>
              <Timelines filter={value} />
            </>
          )}
        </Container>
      </QueryClientProvider>
    </div>
  );
}

export default App;
