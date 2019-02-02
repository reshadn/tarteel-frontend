import React, {Component} from "react"

import {fetchUsers} from "../../api/users";
import T from "../../components/T";
import KEYS from "../../locale/keys";
import {IUser} from "../../types/GlobalState";
import {Container} from "./styles";

interface IDispatchProps {
  setUsers(users: IUser[]): Promise<IUser[]>;
}

interface IOwnProps {
  users: IUser[];
}

interface IStateProps {
  users: IUser;
}

type IProps = IOwnProps & IDispatchProps & IStateProps;

class Users extends Component<IProps, never> {
  public componentDidMount() {
    return fetchUsers()
      .then((users: IUser[]) => {
        return this.props.setUsers(users)
      })
  }
  public render() {
    return (
      <Container>
        <h3>
          <T id={KEYS.USERS_LIST_TITLE}/>
        </h3>
        {
          this.props.users.map((user: IUser, index: number) => {
            return <li key={index}>{ user.name }</li>
          })
        }
      </Container>
    );
  }

}

export default Users
