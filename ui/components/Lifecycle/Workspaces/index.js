import { NoSsr } from '@mui/material';
import { connect } from 'react-redux';
import { withRouter } from 'next/router';
import { Pagination, PaginationItem } from '@layer5/sistent';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DesignsIcon from '../../../assets/icons/DesignIcon';
import WorkspaceIcon from '../../../assets/icons/Workspace';
import { EmptyState } from '../General';
import {
  TransferList,
  Modal as SisitentModal,
  ModalBody,
  ModalFooter,
  PrimaryActionButtons,
  createAndEditWorkspaceSchema,
  createAndEditWorkspaceUiSchema,
  Button,
  Grid,
  Typography,
  DeleteIcon,
  SearchBar,
  styled,
  useTheme,
  PROMPT_VARIANTS,
} from '@layer5/sistent';
import AddIconCircleBorder from '../../../assets/icons/AddIconCircleBorder';
import { useEffect, useRef, useState } from 'react';
import {
  useAssignDesignToWorkspaceMutation,
  useAssignEnvironmentToWorkspaceMutation,
  useCreateWorkspaceMutation,
  useDeleteWorkspaceMutation,
  useGetDesignsOfWorkspaceQuery,
  useGetEnvironmentsOfWorkspaceQuery,
  useGetWorkspacesQuery,
  useUnassignDesignFromWorkspaceMutation,
  useUnassignEnvironmentFromWorkspaceMutation,
  useUpdateWorkspaceMutation,
} from '../../../rtk-query/workspace';
import { updateProgress } from '../../../lib/store';
import { useNotification } from '../../../utils/hooks/useNotification';
import WorkspaceCard from './workspace-card';
import { RJSFModalWrapper } from '../../Modal';
import _PromptComponent from '../../PromptComponent';
import { debounce } from 'lodash';
import { EVENT_TYPES } from '../../../lib/event-types';
import EnvironmentIcon from '../../../assets/icons/Environment';
import { keys } from '@/utils/permission_constants';
import CAN from '@/utils/can';
import DefaultError from '@/components/General/error-404/index';
import { UsesSistent } from '@/components/SistentWrapper';
import { ToolWrapper } from '@/assets/styles/general/tool.styles';

export const CreateButtonWrapper = styled('div')({
  display: 'flex',
  justifyContent: 'flex-start',
  alignItems: 'center',
  whiteSpace: 'nowrap',
});

export const BulkActionWrapper = styled(`div`)({
  width: '100%',
  padding: '0.8rem',
  justifyContent: 'space-between',
  marginTop: '0.18rem',
  marginBottom: '1rem',
  borderRadius: '.25rem',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
});

const ACTION_TYPES = {
  CREATE: 'create',
  EDIT: 'edit',
};

const Workspaces = ({ organization }) => {
  const theme = useTheme();
  const [workspaceModal, setWorkspaceModal] = useState({
    open: false,
    schema: {},
  });
  const [page, setPage] = useState(0);
  const [pageSize /*setPageSize*/] = useState(10);
  const [sortOrder /*setSortOrder*/] = useState('');
  const [search, setSearch] = useState('');

  const [orgId, setOrgId] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [actionType, setActionType] = useState('');
  const [initialData, setInitialData] = useState({});
  const [editWorkspaceId, setEditWorkspaceId] = useState('');

  const [assignEnvironmentModal, setAssignEnvironmentModal] = useState(false);
  const [environmentAssignWorkspace, setEnvironmentAssignWorkspace] = useState({});
  const [environmentsData, setEnvironmentsData] = useState([]);
  const [environmentsPage, setEnvironmentsPage] = useState(0);
  const [environmentsPageSize /*setEnvironmentsPageSize*/] = useState(25);
  const [workspaceEnvironmentsData, setWorkspaceEnvironmentsData] = useState([]);
  const [skipEnvironments, setSkipEnvironments] = useState(true);
  const [assignedEnvironments, setAssignedEnvironments] = useState([]);
  const [environmentsOfWorkspacePage, setEnvironmentsOfWorkspacePage] = useState(0);
  const [assignDesignModal, setAssignDesignModal] = useState(false);
  const [designAssignWorkspace, setDesignAssignWorkspace] = useState({});
  const [designsData, setDesignsData] = useState([]);
  const [workspaceDesignsData, setWorkspaceDesignsData] = useState([]);
  const [assignedDesigns, setAssignedDesigns] = useState([]);
  const [skipDesigns, setSkipDesigns] = useState(true);
  const [designsOfWorkspacePage, setDesignsOfWorkspacePage] = useState(0);
  const [designsPage, setDesignsPage] = useState(0);
  const [designsPageSize /*setDesignssPageSize*/] = useState(25);
  const [selectedWorkspaces, setSelectedWorkspaces] = useState([]);
  const [disableTranferButton, setDisableTranferButton] = useState(true);

  const ref = useRef(null);
  const bulkDeleteRef = useRef(null);
  const { notify } = useNotification();

  const {
    data: workspacesData,
    isError: isWorkspacesError,
    error: workspacesError,
  } = useGetWorkspacesQuery(
    {
      page: page,
      pagesize: pageSize,
      search: search,
      order: sortOrder,
      orgId: orgId,
    },
    {
      skip: !orgId ? true : false,
    },
  );

  const [createWorkspace] = useCreateWorkspaceMutation();

  const [updateWorkspace] = useUpdateWorkspaceMutation();

  const [deleteWorkspace] = useDeleteWorkspaceMutation();

  const {
    data: environments,
    isError: isEnvironmentsError,
    error: environmentsError,
  } = useGetEnvironmentsOfWorkspaceQuery(
    {
      workspaceId: environmentAssignWorkspace.id,
      page: environmentsData.length === 0 ? 0 : environmentsPage,
      pagesize: environmentsPageSize,
      filter: '{"assigned":false}',
    },
    {
      skip: skipEnvironments,
    },
  );

  const {
    data: environmentsOfWorkspace,
    isError: isEnvironmentsOfWorkspaceError,
    error: environmentsOfWorkspaceError,
  } = useGetEnvironmentsOfWorkspaceQuery(
    {
      workspaceId: environmentAssignWorkspace.id,
      page: workspaceEnvironmentsData.length === 0 ? 0 : environmentsOfWorkspacePage,
      pagesize: environmentsPageSize,
    },
    {
      skip: skipEnvironments,
    },
  );

  const [assignEnvironmentToWorkspace] = useAssignEnvironmentToWorkspaceMutation();

  const [unassignEnvironmentFromWorkspace] = useUnassignEnvironmentFromWorkspaceMutation();

  const { data: designs } = useGetDesignsOfWorkspaceQuery(
    {
      workspaceId: designAssignWorkspace.id,
      page: designsData.length === 0 ? 0 : designsPage,
      pagesize: designsPageSize,
      filter: '{"assigned":false}',
    },
    {
      skip: skipDesigns,
    },
  );

  const {
    data: designsOfWorkspace,
    isError: isDesignsOfWorkspaceError,
    error: designsOfWorkspaceError,
  } = useGetDesignsOfWorkspaceQuery(
    {
      workspaceId: designAssignWorkspace.id,
      page: workspaceDesignsData.length === 0 ? 0 : designsOfWorkspacePage,
      pagesize: designsPageSize,
    },
    {
      skip: skipDesigns,
    },
  );

  const [assignDesignToWorkspace] = useAssignDesignToWorkspaceMutation();

  const [unassignDesignFromWorkspace] = useUnassignDesignFromWorkspaceMutation();

  const workspaces = workspacesData?.workspaces ? workspacesData.workspaces : [];
  const environmentsDataRtk = environments?.environments ? environments.environments : [];
  const designsDataRtk = designs?.designs ? designs.designs : [];
  const environmentsOfWorkspaceDataRtk = environmentsOfWorkspace?.environments
    ? environmentsOfWorkspace.environments
    : [];
  const designsOfWorkspaceDataRtk = designsOfWorkspace?.designs ? designsOfWorkspace.designs : [];

  useEffect(() => {
    setEnvironmentsData((prevData) => [...prevData, ...environmentsDataRtk]);
  }, [environments]);

  useEffect(() => {
    setDesignsData((prevData) => [...prevData, ...designsDataRtk]);
  }, [designs]);

  useEffect(() => {
    setWorkspaceEnvironmentsData((prevData) => [...prevData, ...environmentsOfWorkspaceDataRtk]);
  }, [environmentsOfWorkspace]);

  useEffect(() => {
    setWorkspaceDesignsData((prevData) => [...prevData, ...designsOfWorkspaceDataRtk]);
  }, [designsOfWorkspace]);

  const handleCreateWorkspace = ({ organization, name, description }) => {
    createWorkspace({
      workspacePayload: {
        name: name,
        description: description,
        organization_id: organization,
      },
    })
      .unwrap()
      .then(() => handleSuccess(`Workspace "${name}" created `))
      .catch((error) => handleError(`Workspace Create Error: ${error?.data}`));
    handleWorkspaceModalClose();
  };

  const handleEditWorkspace = ({ organization, name, description }) => {
    updateWorkspace({
      workspaceId: editWorkspaceId,
      workspacePayload: {
        name: name,
        description: description,
        organization_id: organization,
      },
    })
      .unwrap()
      .then(() => handleSuccess(`Workspace "${name}" updated`))
      .catch((error) => handleError(`Workspace Update Error: ${error?.data}`));
    handleWorkspaceModalClose();
  };

  const handleDeleteWorkspace = (id, name) => {
    deleteWorkspace({
      workspaceId: id,
    })
      .unwrap()
      .then(() => handleSuccess(`Workspace "${name}" deleted`))
      .catch((error) => handleError(`Workspace Delete Error: ${error?.data}`));
  };

  useEffect(() => {
    if (isWorkspacesError) {
      handleError(`Workspaces Fetching Error: ${workspacesError?.data}`);
    }
    if (isEnvironmentsError) {
      handleError(`Environments Fetching Error: ${environmentsError?.data}`);
    }
    if (isEnvironmentsOfWorkspaceError) {
      handleError(
        `Environments of Workspace Fetching Error: ${environmentsOfWorkspaceError?.data}`,
      );
    }
    if (isDesignsOfWorkspaceError) {
      handleError(`Designs of Workspace Fetching Error: ${designsOfWorkspaceError?.data}`);
    }
  }, [
    isWorkspacesError,
    workspacesError,
    isEnvironmentsError,
    environmentsError,
    isEnvironmentsOfWorkspaceError,
    environmentsOfWorkspaceError,
    isDesignsOfWorkspaceError,
    designsOfWorkspaceError,
    handleError,
  ]);

  useEffect(() => {
    setOrgId(organization?.id);
  }, [organization]);

  const fetchSchema = () => {
    const updatedSchema = {
      schema: createAndEditWorkspaceSchema,
      uiSchema: createAndEditWorkspaceUiSchema,
    };
    updatedSchema.schema?.properties?.organization &&
      ((updatedSchema.schema = {
        ...updatedSchema.schema,
        properties: {
          ...updatedSchema.schema.properties,
          organization: {
            ...updatedSchema.schema.properties.organization,
            enum: [organization?.id],
            enumNames: [organization?.name],
          },
        },
      }),
      (updatedSchema.uiSchema = {
        ...updatedSchema.uiSchema,
        organization: {
          ...updatedSchema.uiSchema.organization,
          ['ui:widget']: 'hidden',
        },
      }));
    setWorkspaceModal({
      open: true,
      schema: updatedSchema,
    });
  };

  const handleError = (action) => (error) => {
    updateProgress({ showProgress: false });
    notify({
      message: `${action.error_msg}: ${error}`,
      event_type: EVENT_TYPES.ERROR,
      details: error.toString(),
    });
  };

  const handleSuccess = (msg) => {
    updateProgress({ showProgress: false });
    notify({
      message: msg,
      event_type: EVENT_TYPES.SUCCESS,
    });
  };

  const handleWorkspaceModalOpen = (e, actionType, workspaceObject) => {
    e.stopPropagation();
    if (actionType === ACTION_TYPES.EDIT) {
      setActionType(ACTION_TYPES.EDIT);
      setInitialData({
        name: workspaceObject.name,
        description: workspaceObject.description,
        organization: workspaceObject.organization_id,
      });
      setEditWorkspaceId(workspaceObject.id);
    } else {
      setActionType(ACTION_TYPES.CREATE);
      setInitialData({
        name: undefined,
        description: '',
        organization: orgId,
      });
      setEditWorkspaceId('');
    }
    fetchSchema();
  };

  const handleWorkspaceModalClose = () => {
    setWorkspaceModal({
      open: false,
      schema: {},
    });
    setActionType('');
  };

  const handleBulkDeleteWorkspace = () => {
    selectedWorkspaces.map((workspaceId) => {
      handleDeleteWorkspace(
        workspaceId,
        workspaces.find((workspace) => workspace.name === name),
      );
    });
    setSelectedWorkspaces([]);
  };

  const handleBulkSelect = (e, id) => {
    const isChecked = e.target.checked;
    if (isChecked) {
      setSelectedWorkspaces([...selectedWorkspaces, id]);
    } else {
      const newSelectedEnv = selectedWorkspaces.filter((env) => env !== id);
      setSelectedWorkspaces(newSelectedEnv);
    }
  };

  const handleDeleteWorkspaceConfirm = async (e, workspace) => {
    e.stopPropagation();
    let response = await ref.current.show({
      title: `Delete workspace ?`,
      subtitle: deleteWorkspaceModalContent(workspace.name),
      primaryOption: 'DELETE',
      variant: PROMPT_VARIANTS.DANGER,
    });
    if (response === 'DELETE') {
      handleDeleteWorkspace(workspace.id, workspace.name);
    }
  };

  const deleteWorkspaceModalContent = (workspace) => (
    <>
      <p>Are you sure you want to delete this workspace? (This action is irreversible)</p>
      <p>
        Workspace Name:
        <i>
          <b>{workspace}</b>
        </i>
      </p>
    </>
  );

  const handleBulkDeleteWorkspaceConfirm = async (e) => {
    e.stopPropagation();
    let response = await bulkDeleteRef.current.show({
      title: `Delete ${selectedWorkspaces.length} workspaces ?`,
      subtitle: deleteBlukWorkspaceModalContent(),
      primaryOption: 'DELETE',
      variant: PROMPT_VARIANTS.DANGER,
    });
    if (response === 'DELETE') {
      handleBulkDeleteWorkspace();
    }
  };

  const deleteBlukWorkspaceModalContent = () => (
    <p>Are you sure you want to delete these workspaces? (This action is irreversible)</p>
  );

  const handleAssignEnvironmentModalClose = () => {
    setAssignEnvironmentModal(false);
    setSkipEnvironments(true);
  };

  const handleAssignEnvironmentModalOpen = (e, workspace) => {
    e.stopPropagation();
    setAssignEnvironmentModal(true);
    if (environmentAssignWorkspace.id !== workspace.id) {
      setWorkspaceEnvironmentsData([]);
      setEnvironmentsData([]);
    }
    setEnvironmentAssignWorkspace(workspace);
    setSkipEnvironments(false);
  };

  const handleAssignEnvironmentsData = (updatedAssignedData) => {
    const { addedEnvironmentsIds, removedEnvironmentsIds } =
      getAddedAndRemovedEnvironments(updatedAssignedData);
    (addedEnvironmentsIds.length > 0 || removedEnvironmentsIds.length) > 0
      ? setDisableTranferButton(false)
      : setDisableTranferButton(true);

    setAssignedEnvironments(updatedAssignedData);
  };

  const handleAssignEnvironments = () => {
    const { addedEnvironmentsIds, removedEnvironmentsIds } =
      getAddedAndRemovedEnvironments(assignedEnvironments);

    addedEnvironmentsIds.map((id) =>
      assignEnvironmentToWorkspace({
        workspaceId: environmentAssignWorkspace.id,
        environmentId: id,
      }).unwrap(),
    );

    removedEnvironmentsIds.map((id) =>
      unassignEnvironmentFromWorkspace({
        workspaceId: environmentAssignWorkspace.id,
        environmentId: id,
      }).unwrap(),
    );
    setEnvironmentsData([]);
    setWorkspaceEnvironmentsData([]);
    handleAssignEnvironmentModalClose();
  };

  const getAddedAndRemovedEnvironments = (allAssignedEnvironments) => {
    const originalEnvironmentsIds = workspaceEnvironmentsData.map((environment) => environment.id);
    const updatedEnvironmentsIds = allAssignedEnvironments.map((environment) => environment.id);

    const addedEnvironmentsIds = updatedEnvironmentsIds.filter(
      (id) => !originalEnvironmentsIds.includes(id),
    );
    const removedEnvironmentsIds = originalEnvironmentsIds.filter(
      (id) => !updatedEnvironmentsIds.includes(id),
    );
    return {
      addedEnvironmentsIds,
      removedEnvironmentsIds,
    };
  };

  const handleAssignDesignModalClose = () => {
    setAssignDesignModal(false);
    setSkipDesigns(true);
  };

  const handleAssignDesignModalOpen = (e, workspace) => {
    e.stopPropagation();
    setAssignDesignModal(true);
    if (designAssignWorkspace.id !== workspace.id) {
      setWorkspaceDesignsData([]);
      setDesignsData([]);
    }
    setDesignAssignWorkspace(workspace);
    setSkipDesigns(false);
  };

  const handleAssignDesignsData = (updatedAssignedData) => {
    const { addedDesignsIds, removedDesignsIds } = getAddedAndRemovedDesigns(updatedAssignedData);
    (addedDesignsIds.length > 0 || removedDesignsIds.length) > 0
      ? setDisableTranferButton(false)
      : setDisableTranferButton(true);

    setAssignedDesigns(updatedAssignedData);
  };

  const handleAssignDesigns = () => {
    const { addedDesignsIds, removedDesignsIds } = getAddedAndRemovedDesigns(assignedDesigns);

    addedDesignsIds.map((id) =>
      assignDesignToWorkspace({
        workspaceId: designAssignWorkspace.id,
        designId: id,
      }).unwrap(),
    );

    removedDesignsIds.map((id) =>
      unassignDesignFromWorkspace({
        workspaceId: designAssignWorkspace.id,
        designId: id,
      }).unwrap(),
    );
    setDesignsData([]);
    setWorkspaceDesignsData([]);
    handleAssignDesignModalClose();
  };

  const getAddedAndRemovedDesigns = (allAssignedDesigns) => {
    const originalDesignsIds = workspaceDesignsData.map((design) => design.id);
    const updatedDesignsIds = allAssignedDesigns.map((design) => design.id);

    const addedDesignsIds = updatedDesignsIds.filter((id) => !originalDesignsIds.includes(id));
    const removedDesignsIds = originalDesignsIds.filter((id) => !updatedDesignsIds.includes(id));

    return {
      addedDesignsIds,
      removedDesignsIds,
    };
  };

  const handleAssignablePageEnvironment = () => {
    const pagesCount = parseInt(
      Math.ceil(parseInt(environments?.total_count) / environmentsPageSize),
    );
    if (environmentsPage < pagesCount - 1) {
      setEnvironmentsPage((prevEnvironmentsPage) => prevEnvironmentsPage + 1);
    }
  };

  const handleAssignedPageEnvironment = () => {
    const pagesCount = parseInt(
      Math.ceil(parseInt(environmentsOfWorkspace?.total_count) / environmentsPageSize),
    );
    if (environmentsOfWorkspacePage < pagesCount - 1) {
      setEnvironmentsOfWorkspacePage(
        (prevEnvironmentsOfWorkspacePage) => prevEnvironmentsOfWorkspacePage + 1,
      );
    }
  };

  const handleAssignablePageDesign = () => {
    const pagesCount = parseInt(Math.ceil(parseInt(designs?.total_count) / designsPageSize));
    if (designsPage < pagesCount - 1) {
      setDesignsPage((prevDesignsPage) => prevDesignsPage + 1);
    }
  };

  const handleAssignedPageDesign = () => {
    const pagesCount = parseInt(
      Math.ceil(parseInt(designsOfWorkspace?.total_count) / designsPageSize),
    );
    if (designsOfWorkspacePage < pagesCount - 1) {
      setDesignsOfWorkspacePage((prevDesignsOfWorkspacePage) => prevDesignsOfWorkspacePage + 1);
    }
  };

  return (
    <UsesSistent>
      <NoSsr>
        {CAN(keys.VIEW_WORKSPACE.action, keys.VIEW_WORKSPACE.subject) ? (
          <>
            <ToolWrapper>
              <CreateButtonWrapper>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={(e) => handleWorkspaceModalOpen(e, ACTION_TYPES.CREATE)}
                  sx={{
                    backgroundColor: '#607d8b',
                    padding: '8px',
                    borderRadius: '5px',
                    marginRight: '2rem',
                  }}
                  disabled={!CAN(keys.CREATE_WORKSPACE.action, keys.CREATE_WORKSPACE.subject)}
                  data-cy="btnResetDatabase"
                >
                  <AddIconCircleBorder sx={{ width: '20px', height: '20px' }} />
                  <Typography
                    sx={{
                      paddingLeft: '4px',
                      marginRight: '4px',
                      textTransform: 'none',
                    }}
                  >
                    Create
                  </Typography>
                </Button>
              </CreateButtonWrapper>
              <SearchBar
                onSearch={(value) => {
                  setSearch(value);
                }}
                placeholder="Search Workspaces..."
                expanded={isSearchExpanded}
                setExpanded={setIsSearchExpanded}
              />
            </ToolWrapper>
            {selectedWorkspaces.length > 0 && (
              <BulkActionWrapper>
                <Typography>
                  {selectedWorkspaces.length > 1
                    ? `${selectedWorkspaces.length} workspaces selected`
                    : `${selectedWorkspaces.length} workspace selected`}
                </Typography>
                <Button>
                  <DeleteIcon
                    fill={theme.palette.text.default}
                    onClick={handleBulkDeleteWorkspaceConfirm}
                    disabled={
                      CAN(keys.DELETE_WORKSPACE.action, keys.DELETE_WORKSPACE.subject) &&
                      selectedWorkspaces.length > 0
                        ? false
                        : true
                    }
                  />
                </Button>
              </BulkActionWrapper>
            )}
            {workspaces.length > 0 ? (
              <>
                <Grid container spacing={2} sx={{ marginTop: '10px' }}>
                  {workspaces.map((workspace) => (
                    <Grid item xs={12} md={6} key={workspace.id}>
                      <WorkspaceCard
                        workspaceDetails={workspace}
                        onEdit={(e) => handleWorkspaceModalOpen(e, ACTION_TYPES.EDIT, workspace)}
                        onDelete={(e) => handleDeleteWorkspaceConfirm(e, workspace)}
                        onSelect={(e) => handleBulkSelect(e, workspace.id)}
                        selectedWorkspaces={selectedWorkspaces}
                        onAssignEnvironment={(e) => handleAssignEnvironmentModalOpen(e, workspace)}
                        onAssignDesign={(e) => handleAssignDesignModalOpen(e, workspace)}
                      />
                    </Grid>
                  ))}
                </Grid>
                <Grid
                  container
                  sx={{ padding: '2rem 0', marginTop: '20px' }}
                  flex
                  justifyContent="center"
                  spacing={2}
                >
                  <Pagination
                    count={Math.ceil(workspacesData?.total_count / pageSize)}
                    page={page + 1}
                    onChange={debounce((_, page) => setPage(page - 1), 150)}
                    boundaryCount={3}
                    renderItem={(item) => (
                      <PaginationItem
                        slots={{ previous: ChevronLeftIcon, next: ChevronRightIcon }}
                        {...item}
                      />
                    )}
                  />
                </Grid>
              </>
            ) : (
              <EmptyState
                icon={<WorkspaceIcon height="6rem" width="6rem" fill="#808080" />}
                message="No workspace available"
                pointerLabel="Click “Create” to establish your first workspace."
              />
            )}
            {(actionType === ACTION_TYPES.CREATE
              ? CAN(keys.CREATE_WORKSPACE.action, keys.CREATE_WORKSPACE.subject)
              : CAN(keys.EDIT_WORKSPACE.action, keys.EDIT_WORKSPACE.subject)) &&
              workspaceModal.open && (
                <SisitentModal
                  open={workspaceModal.open}
                  closeModal={handleWorkspaceModalClose}
                  title={actionType === ACTION_TYPES.CREATE ? 'Create Workspace' : 'Edit Workspace'}
                >
                  <RJSFModalWrapper
                    schema={workspaceModal.schema.schema}
                    uiSchema={workspaceModal.schema.uiSchema}
                    handleSubmit={
                      actionType === ACTION_TYPES.CREATE
                        ? handleCreateWorkspace
                        : handleEditWorkspace
                    }
                    submitBtnText={actionType === ACTION_TYPES.CREATE ? 'Save' : 'Update'}
                    initialData={initialData}
                    handleClose={handleWorkspaceModalClose}
                  />
                </SisitentModal>
              )}
            <SisitentModal
              open={assignEnvironmentModal}
              closeModal={handleAssignEnvironmentModalClose}
              title={`Assign Environments to ${environmentAssignWorkspace.name}`}
              headerIcon={<EnvironmentIcon height="2rem" width="2rem" fill="white" />}
              maxWidth="md"
            >
              <ModalBody>
                <TransferList
                  name="Environments"
                  assignableData={environmentsData}
                  assignedData={handleAssignEnvironmentsData}
                  originalAssignedData={workspaceEnvironmentsData}
                  emptyStateIconLeft={
                    <EnvironmentIcon
                      height="5rem"
                      width="5rem"
                      fill="#808080"
                      secondaryFill="#979797"
                    />
                  }
                  emtyStateMessageLeft="No environments available"
                  emptyStateIconRight={
                    <EnvironmentIcon
                      height="5rem"
                      width="5rem"
                      fill="#808080"
                      secondaryFill="#979797"
                    />
                  }
                  emtyStateMessageRight="No environments assigned"
                  assignablePage={handleAssignablePageEnvironment}
                  assignedPage={handleAssignedPageEnvironment}
                  originalLeftCount={environments?.total_count}
                  originalRightCount={environmentsOfWorkspace?.total_count}
                  leftPermission={CAN(
                    keys.ASSIGN_ENVIRONMENT_TO_WORKSPACE.action,
                    keys.ASSIGN_ENVIRONMENT_TO_WORKSPACE.subject,
                  )}
                  rightPermission={CAN(
                    keys.REMOVE_ENVIRONMENT_FROM_WORKSPACE.action,
                    keys.REMOVE_ENVIRONMENT_FROM_WORKSPACE.subject,
                  )}
                />
              </ModalBody>
              <ModalFooter variant="filled" helpText="Assign environment to workspace">
                <PrimaryActionButtons
                  primaryText="Save"
                  secondaryText="Cancel"
                  primaryButtonProps={{
                    onClick: handleAssignEnvironments,
                    disabled: disableTranferButton,
                  }}
                  secondaryButtonProps={{
                    onClick: handleAssignEnvironmentModalClose,
                  }}
                />
              </ModalFooter>
            </SisitentModal>

            <SisitentModal
              open={assignDesignModal}
              closeModal={handleAssignDesignModalClose}
              title={`Assign Designs to ${designAssignWorkspace.name}`}
              headerIcon={<DesignsIcon height="2rem" width="2rem" fill="#ffffff" />}
              maxWidth="md"
            >
              <ModalBody>
                <TransferList
                  name="Designs"
                  assignableData={designsData}
                  assignedData={handleAssignDesignsData}
                  originalAssignedData={workspaceDesignsData}
                  emptyStateIconLeft={<DesignsIcon height="5rem" width="5rem" />}
                  emtyStateMessageLeft="No designs available"
                  emptyStateIconRight={<DesignsIcon height="5rem" width="5rem" />}
                  emtyStateMessageRight="No designs assigned"
                  assignablePage={handleAssignablePageDesign}
                  assignedPage={handleAssignedPageDesign}
                  originalLeftCount={designs?.total_count}
                  originalRightCount={designsOfWorkspace?.total_count}
                  leftPermission={true}
                  rightPermission={true}
                />
              </ModalBody>
              <ModalFooter variant="filled" helpText="Assign designs to workspace">
                <PrimaryActionButtons
                  primaryText="Save"
                  secondaryText="Cancel"
                  primaryButtonProps={{
                    onClick: handleAssignDesigns,
                    disabled: disableTranferButton,
                  }}
                  secondaryButtonProps={{
                    onClick: handleAssignDesignModalClose,
                  }}
                />
              </ModalFooter>
            </SisitentModal>
            <_PromptComponent ref={ref} />
            <_PromptComponent ref={bulkDeleteRef} />
          </>
        ) : (
          <DefaultError />
        )}
      </NoSsr>
    </UsesSistent>
  );
};

const mapStateToProps = (state) => {
  const organization = state.get('organization');
  return {
    organization,
  };
};

const WorkspacesPageWithErrorBoundary = (props) => {
  return (
    <NoSsr>
      <Workspaces {...props} />
    </NoSsr>
  );
};

export default connect(mapStateToProps)(withRouter(WorkspacesPageWithErrorBoundary));
