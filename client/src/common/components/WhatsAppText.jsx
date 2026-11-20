// Shows a WhatsApp message the way WhatsApp will: *word* is bold (new lines
// are kept by the place that shows it).
const WhatsAppText = ({ text }) =>
  text.split(/(\*[^*\n]+\*)/g).map((part, index) =>
    /^\*[^*\n]+\*$/.test(part) ? (
      <strong key={index}>{part.slice(1, -1)}</strong>
    ) : (
      part
    )
  );

export default WhatsAppText;
