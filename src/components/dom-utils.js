export function labelWrap(label, input) {
  const wrap = document.createElement("label");
  wrap.className = "control";
  const text = document.createElement("span");
  text.textContent = label;
  wrap.append(text, input);
  return wrap;
}

export function sectionHeading(title, description) {
  const heading = document.createElement("div");
  heading.className = "section-heading";
  const inner = document.createElement("div");
  const h2 = document.createElement("h2");
  h2.textContent = title;
  const p = document.createElement("p");
  p.textContent = description;
  inner.append(h2, p);
  heading.append(inner);
  return heading;
}
