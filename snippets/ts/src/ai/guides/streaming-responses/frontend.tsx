const topic = "my-topic";

// <start_here>
let offset = 0;
const evtSource = new EventSource(`/pubsub/${topic}?offset=${offset}`);

evtSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // show the new messages in the UI...
};
// <end_here>