import React from "react";
import { useState } from "react";

const NewComponent = () => {
  const [openItem, setOpenItem] = useState(false);
  const items = [
    {
      title: "Section 1",
      content: "This is the content for section 1"
    },
    {
      title: "Section 2",
      content: "This is the content for section 2"
    },
    {
      title: "Section 3",
      content: "This is the content for section 3"
    }
  ];

  const clickHandler = (index) => {
    console.log('You clicked', index);
    setOpenItem(openItem === index ? null : index);
  };


  return <div>
    <h1>Accordion</h1>
    {items.map((item, index) => (
      <div key={index} className="accordion-item">
        <div
          className="accordion-title"
          onClick={() => clickHandler(index)}
        >
          {item.title}
        </div>
        {openItem === index && (
          <div className="accordion-content">{item.content}</div>
        )}
      </div>
    ))}
  </div>;
};

export default NewComponent;