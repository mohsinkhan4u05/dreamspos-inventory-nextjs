declare module "swagger-ui-react" {
  import * as React from "react";

  export interface SwaggerUIProps {
    spec?: any;
    url?: string;
  }

  export default class SwaggerUI extends React.Component<SwaggerUIProps> {}
}
